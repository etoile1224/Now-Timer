import { pool } from '@workspace/db';

type Row = Record<string, unknown>;

export async function query<T extends Row = Row>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

export async function queryOne<T extends Row = Row>(
  sql: string,
  params?: unknown[],
): Promise<T | undefined> {
  return (await query<T>(sql, params))[0];
}

export async function run(sql: string, params?: unknown[]): Promise<void> {
  await pool.query(sql, params);
}
