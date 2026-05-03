import { eq } from "drizzle-orm";
import { createError } from "h3";

import { db } from "../database";
import { settings } from "../database/schema";

const SEPAY_API_BASE_URL = "https://userapi.sepay.vn/v2";

export interface SePayTransactionItem {
  id: string;
  transaction_date: string | null;
  account_number: string | null;
  va: string | null;
  transfer_type: "in" | "out" | string | null;
  amount_in: number;
  amount_out: number;
  accumulated: number | null;
  transaction_content: string | null;
  reference_number: string | null;
  code: string | null;
  bank_brand_name: string | null;
  bank_account_id: string | null;
  va_id: string | null;
  webhook_success: number | null;
}

export interface SePayPagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  has_more: boolean;
}

export interface SePayTransactionsQuery {
  q?: string;
  bank_account_id?: string;
  va_id?: string;
  bank_brand_name?: string;
  transaction_date_from?: string;
  transaction_date_to?: string;
  amount_in_min?: number;
  amount_in_max?: number;
  amount_out_min?: number;
  amount_out_max?: number;
  reference_number?: string;
  transaction_content?: string;
  transfer_type?: "in" | "out";
  webhook_success?: 0 | 1;
  since_id?: string;
  transaction_date_sort?: "asc" | "desc";
  amount_in_sort?: "asc" | "desc";
  amount_out_sort?: "asc" | "desc";
  page?: number;
  per_page?: number;
  fields?: string;
  timestamp_format?: "iso8601" | string;
}

interface SePayTransactionsResponse {
  status: string;
  data: SePayTransactionItem[];
  meta?: {
    pagination?: Partial<SePayPagination>;
  };
}

interface SePayTransactionDetailResponse {
  status: string;
  data: SePayTransactionItem;
}

export const getSePayApiKey = async () => {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "sepayApiKey"))
    .limit(1);

  const apiKey = String(row?.value || "").trim();

  if (!apiKey) {
    throw createError({
      statusCode: 400,
      message: "Chưa cấu hình SePay API key trong admin/deposits/config",
    });
  }

  return apiKey;
};

const normalizeSePayTransaction = (
  item: Partial<SePayTransactionItem>,
): SePayTransactionItem => ({
  id: String(item.id || ""),
  transaction_date: item.transaction_date || null,
  account_number: item.account_number || null,
  va: item.va || null,
  transfer_type: item.transfer_type || null,
  amount_in: Number(item.amount_in || 0),
  amount_out: Number(item.amount_out || 0),
  accumulated:
    item.accumulated === null || item.accumulated === undefined
      ? null
      : Number(item.accumulated || 0),
  transaction_content: item.transaction_content || null,
  reference_number: item.reference_number || null,
  code: item.code || null,
  bank_brand_name: item.bank_brand_name || null,
  bank_account_id: item.bank_account_id || null,
  va_id: item.va_id || null,
  webhook_success:
    item.webhook_success === null || item.webhook_success === undefined
      ? null
      : Number(item.webhook_success || 0),
});

const parseSePayErrorMessage = (error: any) =>
  error?.data?.message ||
  error?.data?.error ||
  error?.message ||
  "Không thể kết nối SePay";

export const fetchSePayTransactions = async (
  query: SePayTransactionsQuery = {},
) => {
  const apiKey = await getSePayApiKey();

  try {
    const response = await $fetch<SePayTransactionsResponse>(
      `${SEPAY_API_BASE_URL}/transactions`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        query: {
          ...query,
          timestamp_format: query.timestamp_format || "iso8601",
        },
      },
    );

    return {
      status: response.status,
      items: Array.isArray(response.data)
        ? response.data.map(normalizeSePayTransaction)
        : [],
      pagination: {
        total: Number(response.meta?.pagination?.total || 0),
        per_page: Number(response.meta?.pagination?.per_page || query.per_page || 20),
        current_page: Number(
          response.meta?.pagination?.current_page || query.page || 1,
        ),
        last_page: Number(response.meta?.pagination?.last_page || 1),
        has_more: Boolean(response.meta?.pagination?.has_more),
      } satisfies SePayPagination,
      rawMeta: response.meta || null,
    };
  } catch (error: any) {
    throw createError({
      statusCode: Number(error?.statusCode || error?.status || 502),
      message: `SePay transactions error: ${parseSePayErrorMessage(error)}`,
    });
  }
};

export const fetchSePayTransactionDetail = async (transactionId: string) => {
  const apiKey = await getSePayApiKey();
  const normalizedId = String(transactionId || "").trim();

  if (!normalizedId) {
    throw createError({
      statusCode: 400,
      message: "Thiếu transaction_id của SePay",
    });
  }

  try {
    const response = await $fetch<SePayTransactionDetailResponse>(
      `${SEPAY_API_BASE_URL}/transactions/${normalizedId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    return {
      status: response.status,
      item: normalizeSePayTransaction(response.data || {}),
    };
  } catch (error: any) {
    throw createError({
      statusCode: Number(error?.statusCode || error?.status || 502),
      message: `SePay transaction detail error: ${parseSePayErrorMessage(error)}`,
    });
  }
};
