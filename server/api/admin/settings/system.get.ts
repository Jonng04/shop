import fs from "node:fs/promises";
import path from "node:path";
import type { User } from "#auth-utils";

import {
  requireAdminPermission,
  type AdminSessionUser,
} from "../../../utils/admin-permissions";

interface AdminUser extends User, AdminSessionUser {}

interface PackageJsonInfo {
  version?: string;
  dependencies?: Record<string, string>;
}

const getPackageInfo = async () => {
  const packagePath = path.resolve(process.cwd(), "package.json");
  const raw = await fs.readFile(packagePath, "utf8");
  return JSON.parse(raw) as PackageJsonInfo;
};

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as AdminUser;

  await requireAdminPermission(user, "manage_settings");

  try {
    const packageInfo = await getPackageInfo();

    return {
      appInfo: {
        appVersion: packageInfo.version || "Không rõ",
        nuxtVersion: packageInfo.dependencies?.nuxt || "Không rõ",
        nodeVersion: process.version,
        environment:
          process.env.NODE_ENV === "production" ? "Production" : "Development",
        debugMode: process.env.NODE_ENV === "production" ? "Tắt" : "Bật",
      },
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error?.message || "Không thể tải dữ liệu hệ thống",
    });
  }
});
