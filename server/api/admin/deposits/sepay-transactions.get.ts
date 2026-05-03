import type { User } from "#auth-utils";

import {
  hasAnyAdminPermission,
  requireAdminAccess,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";
import { fetchSePayTransactions } from "../../../utils/sepay";

interface AdminUser extends User, AdminSessionUser {}

const getOptionalString = (value: unknown) => {
  const normalized = String(value || "").trim();
  return normalized || undefined;
};

const getOptionalNumber = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : undefined;
};

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  requireAdminAccess(user);

  const allowed = await hasAnyAdminPermission(user, [
    "view_deposits",
    "manage_deposits",
  ]);

  if (!allowed) {
    throw createError({
      statusCode: 403,
      message: "Bạn không có quyền truy cập giao dịch SePay",
    });
  }

  const query = getQuery(event);
  const perPage = Math.min(Math.max(getOptionalNumber(query.perPage) || 20, 1), 100);
  const page = Math.max(getOptionalNumber(query.page) || 1, 1);
  const webhookSuccess = getOptionalNumber(query.webhookSuccess);
  const transferType = getOptionalString(query.transferType);

  const result = await fetchSePayTransactions({
    q: getOptionalString(query.q),
    bank_account_id: getOptionalString(query.bankAccountId),
    va_id: getOptionalString(query.vaId),
    bank_brand_name: getOptionalString(query.bankBrandName),
    transaction_date_from: getOptionalString(query.transactionDateFrom),
    transaction_date_to: getOptionalString(query.transactionDateTo),
    amount_in_min: getOptionalNumber(query.amountInMin),
    amount_in_max: getOptionalNumber(query.amountInMax),
    amount_out_min: getOptionalNumber(query.amountOutMin),
    amount_out_max: getOptionalNumber(query.amountOutMax),
    reference_number: getOptionalString(query.referenceNumber),
    transaction_content: getOptionalString(query.transactionContent),
    transfer_type:
      transferType === "in" || transferType === "out"
        ? transferType
        : undefined,
    webhook_success:
      webhookSuccess === 0 || webhookSuccess === 1 ? webhookSuccess : undefined,
    since_id: getOptionalString(query.sinceId),
    transaction_date_sort:
      getOptionalString(query.transactionDateSort) === "asc" ? "asc" : "desc",
    amount_in_sort:
      getOptionalString(query.amountInSort) === "asc"
        ? "asc"
        : getOptionalString(query.amountInSort) === "desc"
          ? "desc"
          : undefined,
    amount_out_sort:
      getOptionalString(query.amountOutSort) === "asc"
        ? "asc"
        : getOptionalString(query.amountOutSort) === "desc"
          ? "desc"
          : undefined,
    fields: getOptionalString(query.fields),
    page,
    per_page: perPage,
    timestamp_format: "iso8601",
  });

  return {
    items: result.items,
    pagination: result.pagination,
    meta: result.rawMeta,
    filters: {
      page,
      perPage,
      q: getOptionalString(query.q) || null,
      bankAccountId: getOptionalString(query.bankAccountId) || null,
      vaId: getOptionalString(query.vaId) || null,
      bankBrandName: getOptionalString(query.bankBrandName) || null,
      transactionDateFrom: getOptionalString(query.transactionDateFrom) || null,
      transactionDateTo: getOptionalString(query.transactionDateTo) || null,
      referenceNumber: getOptionalString(query.referenceNumber) || null,
      transactionContent: getOptionalString(query.transactionContent) || null,
      transferType:
        transferType === "in" || transferType === "out" ? transferType : null,
      webhookSuccess:
        webhookSuccess === 0 || webhookSuccess === 1 ? webhookSuccess : null,
      sinceId: getOptionalString(query.sinceId) || null,
    },
  };
});
