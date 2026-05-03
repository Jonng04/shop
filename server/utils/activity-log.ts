import { getHeader, getRequestIP } from "h3";
import { db } from "../database";
import { activityLogs } from "../database/schema";

export interface CreateActivityLogInput {
  actorUserId?: number | null;
  actorName: string;
  actorEmail?: string | null;
  actorRole?: "admin" | "system" | string;
  action: string;
  module: string;
  target: string;
  description?: string | null;
  level?: "info" | "warning" | "success" | "critical" | string;
  ip?: string | null;
  device?: string | null;
  metadata?: Record<string, unknown> | null;
}

export const createActivityLog = async (
  input: CreateActivityLogInput,
) => {
  const [created] = await db
    .insert(activityLogs)
    .values({
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName,
      actorEmail: input.actorEmail ?? null,
      actorRole: input.actorRole || "admin",
      action: input.action,
      module: input.module,
      target: input.target,
      description: input.description ?? null,
      level: input.level || "info",
      ip: input.ip ?? null,
      device: input.device ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    })
    .$returningId();

  return created;
};

export const getRequestContextMeta = (event: Parameters<typeof getRequestIP>[0]) => ({
  ip: getRequestIP(event, { xForwardedFor: true }) || null,
  device: getHeader(event, "user-agent") || null,
});
