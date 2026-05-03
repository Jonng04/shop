export const BUSINESS_TIMEZONE = "Asia/Ho_Chi_Minh";

export type ParsedBusinessDateTime = {
  dbValue: string;
  dateValue: Date;
};

const DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

const pad2 = (value: number) => String(value).padStart(2, "0");

const buildLocalDate = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number
) => {
  const date = new Date(year, month - 1, day, hour, minute, second);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) {
    return null;
  }

  return date;
};

const normalizeToLocalLike = (value: string) => {
  const normalized = value.endsWith("Z") ? value.slice(0, -1) : value;
  const withoutOffset = normalized.replace(/([+-]\d{2}:?\d{2})$/, "");
  const withoutMilliseconds = withoutOffset.replace(/\.\d+$/, "");
  return withoutMilliseconds.includes("T")
    ? withoutMilliseconds
    : withoutMilliseconds.replace(" ", "T");
};

export const parseBusinessDateTimeInput = (
  value: unknown
): ParsedBusinessDateTime | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const localLike = normalizeToLocalLike(raw);
  const match = localLike.match(DATE_TIME_PATTERN);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] || "0");

  const dateValue = buildLocalDate(year, month, day, hour, minute, second);
  if (!dateValue) {
    return null;
  }

  return {
    dbValue: `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${pad2(second)}`,
    dateValue,
  };
};

export const toBusinessDateTimeLocalValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return "";
    }

    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}T${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
  }

  const parsed = parseBusinessDateTimeInput(value);
  if (!parsed) {
    return "";
  }

  const date = parsed.dateValue;
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};
