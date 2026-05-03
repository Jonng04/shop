import fs from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2";
import mysqlPromise from "mysql2/promise";

const formatTimestamp = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
};

const toSqlValue = (value: unknown) => {
  if (value === null || value === undefined) return "NULL";
  if (value instanceof Date) {
    return mysql.escape(value.toISOString().slice(0, 19).replace("T", " "));
  }
  if (Buffer.isBuffer(value)) {
    return `X'${value.toString("hex")}'`;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }
  return mysql.escape(String(value));
};

export interface CreateDatabaseBackupOptions {
  databaseUrl: string;
  retentionCount?: number;
}

export const createDatabaseBackup = async (
  options: CreateDatabaseBackupOptions,
) => {
  const connection = await mysqlPromise.createConnection(options.databaseUrl);

  try {
    const [tableRows] = await connection.query("SHOW TABLES");
    const tables = (tableRows as Record<string, string>[])
      .map((row) => Object.values(row)[0])
      .filter(Boolean);

    const dumpParts: string[] = [
      "-- Shop database backup",
      `-- Generated at ${new Date().toISOString()}`,
      "SET FOREIGN_KEY_CHECKS = 0;",
      "",
    ];

    for (const tableName of tables) {
      const escapedTable = `\`${String(tableName).replace(/`/g, "``")}\``;
      const [createRows] = await connection.query(`SHOW CREATE TABLE ${escapedTable}`);
      const createInfo = (createRows as Array<Record<string, string>>)[0];
      const createStatement =
        createInfo?.["Create Table"] || Object.values(createInfo || {})[1];

      dumpParts.push(`-- Table: ${tableName}`);
      dumpParts.push(`DROP TABLE IF EXISTS ${escapedTable};`);
      dumpParts.push(`${createStatement};`);

      const [rows] = await connection.query(`SELECT * FROM ${escapedTable}`);
      const tableRowsData = rows as Array<Record<string, unknown>>;

      if (tableRowsData.length) {
        const columnNames = Object.keys(tableRowsData[0]).map(
          (column) => `\`${column.replace(/`/g, "``")}\``,
        );

        dumpParts.push(
          `INSERT INTO ${escapedTable} (${columnNames.join(", ")}) VALUES`,
        );

        tableRowsData.forEach((row, index) => {
          const values = Object.values(row).map((value) => toSqlValue(value));
          const suffix = index === tableRowsData.length - 1 ? ";" : ",";
          dumpParts.push(`(${values.join(", ")})${suffix}`);
        });
      }

      dumpParts.push("");
    }

    dumpParts.push("SET FOREIGN_KEY_CHECKS = 1;");

    const backupDir = path.resolve(process.cwd(), "uploads", "backups");
    await fs.mkdir(backupDir, { recursive: true });

    const filename = `shop-backup-${formatTimestamp(new Date())}.sql`;
    const fullPath = path.join(backupDir, filename);
    await fs.writeFile(fullPath, dumpParts.join("\n"), "utf8");

    const retentionCount = Math.max(Number(options.retentionCount || 0), 0);
    if (retentionCount > 0) {
      const existingFiles = (await fs.readdir(backupDir))
        .filter((name) => name.endsWith(".sql"))
        .sort()
        .reverse();

      const redundantFiles = existingFiles.slice(retentionCount);
      await Promise.all(
        redundantFiles.map((name) =>
          fs.unlink(path.join(backupDir, name)).catch(() => undefined),
        ),
      );
    }

    return {
      filename,
      url: `/uploads/backups/${filename}`,
      fullPath,
    };
  } finally {
    await connection.end();
  }
};
