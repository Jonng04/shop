import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { createError } from "h3";
import { db } from "../database";
import { payments, settings, transactions, users } from "../database/schema";
import { createActivityLog } from "./activity-log";
import { emitToUser } from "./socket-io";
import { sendTopupSuccessEmail } from "./mail";
import { fetchSePayTransactions, type SePayTransactionItem } from "./sepay";
import { SOCKET_EVENTS } from "~~/shared/socket";

interface BonusRule {
  amount: number;
  percent: number;
}

interface SuccessfulTopupPayload extends Record<string, unknown> {
  paymentId: number;
  paymentCode: string;
  userId: number;
  username: string;
  email: string;
  receivedAmount: number;
  bonusAmount: number;
  creditedAmount: number;
  balanceAfter: number;
  paidAt: string;
  referenceCode: string | null;
  sepayTransactionId: string | number | null;
}

const parseBonusRules = (value: string | null | undefined) => {
  const raw = String(value || "").trim();

  if (!raw) return [] as BonusRule[];

  return raw
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [amountPart, percentPart] = line.split("|");

      return {
        amount: Number(amountPart || 0),
        percent: Number(percentPart || 0),
      };
    })
    .filter((rule) => rule.amount > 0 && rule.percent > 0)
    .sort((a, b) => a.amount - b.amount);
};

const findBonusAmount = (rules: BonusRule[], amount: number) => {
  const matchedRule = [...rules]
    .reverse()
    .find((rule) => amount >= rule.amount);

  if (!matchedRule) return 0;

  return Math.floor((amount * matchedRule.percent) / 100);
};

const normalizeContent = (value: string | null | undefined) =>
  String(value || "")
    .trim()
    .toUpperCase();

const findMatchingTransaction = (
  invoice: {
    transferContent: string | null;
    amount: number;
  },
  transactionItems: SePayTransactionItem[]
) => {
  const transferContent = normalizeContent(invoice.transferContent);

  if (!transferContent) return null;

  return (
    transactionItems.find((item) => {
      const incomingContent = normalizeContent(item.transaction_content);

      return (
        item.transfer_type === "in" &&
        Number(item.amount_in || 0) >= Number(invoice.amount || 0) &&
        incomingContent.includes(transferContent)
      );
    }) || null
  );
};

export const processPendingTopupInvoices = async () => {
  const now = new Date();

  const [pendingInvoices, settingRows] = await Promise.all([
    db.query.payments.findMany({
      where: and(eq(payments.type, "topup"), eq(payments.status, "pending")),
      orderBy: [asc(payments.id)],
      columns: {
        id: true,
        paymentCode: true,
        userId: true,
        amount: true,
        receivedAmount: true,
        referenceCode: true,
        transferContent: true,
        expiredAt: true,
        createdAt: true,
      },
    }),
    db
      .select({
        key: settings.key,
        value: settings.value,
      })
      .from(settings)
      .where(inArray(settings.key, ["depositBonusRules"])),
  ]);

  if (!pendingInvoices.length) {
    return {
      scanned: 0,
      expired: 0,
      matched: 0,
      paid: 0,
      failed: 0,
      items: [] as Array<Record<string, unknown>>,
    };
  }

  const bonusRuleMap = Object.fromEntries(
    settingRows.map((item) => [item.key, item.value])
  ) as Record<string, string | null>;
  const bonusRules = parseBonusRules(bonusRuleMap.depositBonusRules);

  const expiredInvoices = pendingInvoices.filter(
    (invoice) =>
      !!invoice.expiredAt &&
      new Date(invoice.expiredAt).getTime() <= now.getTime()
  );

  for (const invoice of expiredInvoices) {
    await db
      .update(payments)
      .set({ status: "expired" })
      .where(eq(payments.id, invoice.id));
  }

  const activeInvoices = pendingInvoices.filter(
    (invoice) =>
      !invoice.expiredAt ||
      new Date(invoice.expiredAt).getTime() > now.getTime()
  );

  if (!activeInvoices.length) {
    return {
      scanned: pendingInvoices.length,
      expired: expiredInvoices.length,
      matched: 0,
      paid: 0,
      failed: 0,
      items: [] as Array<Record<string, unknown>>,
    };
  }

  const oldestCreatedAt = activeInvoices
    .map((item) => item.createdAt)
    .filter(Boolean)
    .sort()[0];

  const sepayResult = await fetchSePayTransactions({
    transfer_type: "in",
    transaction_date_from: oldestCreatedAt
      ? new Date(oldestCreatedAt).toISOString()
      : undefined,
    transaction_date_sort: "desc",
    per_page: 100,
    page: 1,
    timestamp_format: "iso8601",
  });

  const transactionItems = sepayResult.items || [];
  const processedItems: Array<Record<string, unknown>> = [];
  let paidCount = 0;
  let matchedCount = 0;
  let failedCount = 0;

  for (const invoice of activeInvoices) {
    const matchedTransaction = findMatchingTransaction(
      invoice,
      transactionItems
    );

    if (!matchedTransaction) {
      continue;
    }

    matchedCount += 1;

    try {
      let successLogPayload: SuccessfulTopupPayload | null = null;
      let skippedBecauseAlreadyHandled = false;

      await db.transaction(async (tx) => {
        const [paymentRows] = await tx.execute(
          sql`SELECT id, payment_code AS paymentCode, user_id AS userId, amount, status FROM payments WHERE id = ${invoice.id} FOR UPDATE`
        );

        const payment = (
          paymentRows as unknown as Array<{
            id: number;
            paymentCode: string;
            userId: number | null;
            amount: number;
            status: string;
          }>
        )[0] as
          | {
              id: number;
              paymentCode: string;
              userId: number | null;
              amount: number;
              status: string;
            }
          | undefined;

        if (!payment || String(payment.status) !== "pending") {
          skippedBecauseAlreadyHandled = true;
          return;
        }

        if (!payment?.userId) {
          throw createError({
            statusCode: 404,
            message: `Không tìm thấy hóa đơn ${invoice.paymentCode}`,
          });
        }

        const existingDepositTransaction =
          await tx.query.transactions.findFirst({
            where: and(
              eq(transactions.paymentId, Number(payment.id)),
              eq(transactions.type, "deposit")
            ),
            columns: { id: true },
          });

        if (existingDepositTransaction?.id) {
          skippedBecauseAlreadyHandled = true;
          return;
        }

        const dbUser = await tx.query.users.findFirst({
          where: eq(users.id, payment.userId),
          columns: {
            id: true,
            username: true,
            email: true,
            balance: true,
            totalBalance: true,
          },
        });

        if (!dbUser) {
          throw createError({
            statusCode: 404,
            message: `Không tìm thấy user của hóa đơn ${invoice.paymentCode}`,
          });
        }

        const receivedAmount = Number(matchedTransaction.amount_in || 0);
        const bonusAmount = findBonusAmount(bonusRules, receivedAmount);
        const creditedAmount = receivedAmount + bonusAmount;
        const balanceBefore = Number(dbUser.balance || 0);
        const balanceAfter = balanceBefore + creditedAmount;
        const totalBalanceAfter =
          Number(dbUser.totalBalance || 0) + creditedAmount;
        const paidAt = matchedTransaction.transaction_date
          ? new Date(matchedTransaction.transaction_date)
          : new Date();
        const referenceCode =
          matchedTransaction.reference_number ||
          matchedTransaction.code ||
          matchedTransaction.id;

        await tx
          .update(payments)
          .set({
            status: "paid",
            receivedAmount,
            referenceCode,
            paidAt,
          })
          .where(eq(payments.id, payment.id));

        await tx
          .update(users)
          .set({
            balance: balanceAfter,
            totalBalance: totalBalanceAfter,
          })
          .where(eq(users.id, dbUser.id));

        await tx.insert(transactions).values({
          userId: dbUser.id,
          paymentId: payment.id,
          balanceBefore,
          amount: creditedAmount,
          balanceAfter,
          type: "deposit",
          description: `Nạp tiền hóa đơn ${payment.paymentCode}`,
        });

        successLogPayload = {
          paymentId: payment.id,
          paymentCode: payment.paymentCode,
          userId: dbUser.id,
          username: String(dbUser.username || "Khách hàng"),
          email: String(dbUser.email || ""),
          receivedAmount,
          bonusAmount,
          creditedAmount,
          balanceAfter,
          paidAt: paidAt.toISOString(),
          referenceCode: referenceCode ? String(referenceCode) : null,
          sepayTransactionId: matchedTransaction.id || null,
        };
      });

      if (skippedBecauseAlreadyHandled) {
        continue;
      }

      if (successLogPayload) {
        const payload = successLogPayload as SuccessfulTopupPayload;
        await createActivityLog({
          actorUserId: null,
          actorName: "Cron Deposit",
          actorEmail: null,
          actorRole: "system",
          action: "deposit_paid_auto",
          module: "wallet",
          target: payload.paymentCode,
          description: `Đã tự động cộng ${payload.creditedAmount.toLocaleString("vi-VN")}đ cho user #${payload.userId}`,
          level: "success",
          metadata: payload,
        });

        processedItems.push({
          ...payload,
          status: "paid",
        });

        emitToUser(payload.userId, SOCKET_EVENTS.paymentUpdated, {
          paymentCode: payload.paymentCode,
          paymentId: payload.paymentId,
          status: "paid",
          receivedAmount: payload.receivedAmount,
          creditedAmount: payload.creditedAmount,
          bonusAmount: payload.bonusAmount,
          referenceCode: payload.referenceCode,
          type: "topup",
        });

        void sendTopupSuccessEmail({
          toEmail: payload.email,
          toName: payload.username,
          paymentCode: payload.paymentCode,
          receivedAmount: Number(payload.receivedAmount || 0),
          bonusAmount: Number(payload.bonusAmount || 0),
          creditedAmount: Number(payload.creditedAmount || 0),
          balanceAfter: Number(payload.balanceAfter || 0),
          paidAt: String(payload.paidAt || ""),
        });
      }

      paidCount += 1;
    } catch (error: any) {
      failedCount += 1;
      processedItems.push({
        paymentId: invoice.id,
        paymentCode: invoice.paymentCode,
        status: "failed",
        error: error?.message || "Unknown error",
      });
    }
  }

  return {
    scanned: pendingInvoices.length,
    expired: expiredInvoices.length,
    matched: matchedCount,
    paid: paidCount,
    failed: failedCount,
    items: processedItems,
  };
};
