const SECRET_SETTING_KEYS = new Set([
  "sepayApiKey",
  "cronSecretKey",
  "turnstileSecretKey",
]);

const SECRET_MASK = "********";

const isSecretSettingKey = (key: string) => SECRET_SETTING_KEYS.has(key);

const maskSettingValue = (key: string, value: string | null) => {
  if (!isSecretSettingKey(key)) {
    return value;
  }

  return value ? SECRET_MASK : "";
};

export { SECRET_MASK, isSecretSettingKey, maskSettingValue };
