import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { URL } from "url";
import * as schema from "./schema";

// Parse DATABASE_URL and create pool with optimized settings for 80-150 concurrent users
const dbUrl = new URL(process.env.DATABASE_URL!);
const pool = mysql.createPool({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port || "3306"),
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  waitForConnections: true,
  connectionLimit: 50, // Increased from default 10 to handle 80-150 concurrent users
  maxIdle: 10,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

export const db = drizzle(pool, { schema, mode: "default" });
