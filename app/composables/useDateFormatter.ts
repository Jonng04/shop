type DateInput = string | number | Date | null | undefined;

const parseServerDate = (value: DateInput) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // Server timestamps are intended to be shown as local business time.
  // Strip the trailing UTC marker to avoid auto-shifting +7 hours on the client.
  const normalized = raw.endsWith("Z") ? raw.slice(0, -1) : raw;
  const localLike = normalized.includes("T")
    ? normalized
    : normalized.replace(" ", "T");

  const parsed = new Date(localLike);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

export const useDateFormatter = () => {
  const formatDateTime = (
    value: DateInput,
    locale: string = "vi-VN",
    options?: Intl.DateTimeFormatOptions
  ) => {
    const date = parseServerDate(value);
    if (!date) return "---";

    return date.toLocaleString(locale, options);
  };

  const formatDate = (
    value: DateInput,
    locale: string = "vi-VN",
    options?: Intl.DateTimeFormatOptions
  ) => {
    const date = parseServerDate(value);
    if (!date) return "---";

    return date.toLocaleDateString(locale, options);
  };

  return {
    parseServerDate,
    formatDateTime,
    formatDate,
  };
};
