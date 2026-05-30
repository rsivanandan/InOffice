import * as SQLite from "expo-sqlite";
import { Paths, File } from "expo-file-system";
import * as Sharing from "expo-sharing";

import * as XLSX from "xlsx";
import type { DayRecord, DayStatus } from "../types";

let db: SQLite.SQLiteDatabase;

export async function initDb() {
  try { await db?.closeAsync(); } catch {}
  db = await SQLite.openDatabaseAsync("rto.db");
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS days (
      date TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'absent'
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

export async function getSetting(key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [key]
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  await db.runAsync(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    [key, value]
  );
}

export async function getDay(date: string): Promise<DayRecord | null> {
  const row = await db.getFirstAsync<DayRecord>(
    "SELECT date, status FROM days WHERE date = ?",
    [date]
  );
  return row ?? null;
}

export async function setDayStatus(date: string, status: DayStatus) {
  await db.runAsync(
    "INSERT OR REPLACE INTO days (date, status) VALUES (?, ?)",
    [date, status]
  );
}

export async function getMonthDays(
  year: number,
  month: number
): Promise<DayRecord[]> {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return await db.getAllAsync<DayRecord>(
    "SELECT date, status FROM days WHERE date LIKE ?",
    [`${prefix}%`]
  );
}

export async function getAllDays(): Promise<DayRecord[]> {
  return await db.getAllAsync<DayRecord>(
    "SELECT date, status FROM days ORDER BY date"
  );
}

export async function deleteAllData() {
  await db.execAsync("DELETE FROM days; DELETE FROM settings;");
}

export async function backupDatabase(): Promise<void> {
  const backupData = await db.serializeAsync();
  const backup = new File(Paths.cache, "rto-backup.db");
  backup.write(backupData);
  await Sharing.shareAsync(backup.uri, {
    mimeType: "application/octet-stream",
  });
}

export async function restoreDatabase(): Promise<boolean> {
  await initDb();
  const result = await File.pickFileAsync({ mimeTypes: ["*/*"] });
  if (result.canceled || !result.result) return false;

  const content = await result.result.bytes();

  const memDb = await SQLite.deserializeDatabaseAsync(content);
  await SQLite.backupDatabaseAsync({
    sourceDatabase: memDb,
    destDatabase: db,
  });

  return true;
}

const VALID_STATUSES: ReadonlySet<DayStatus> = new Set([
  "in-office", "absent", "public-holiday",
  "personal-leave", "sick-leave",
]);

export async function exportToExcel() {
  const days = await getAllDays();
  const rows = days.map((d) => ({ Date: d.date, Status: d.status }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const wbout = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Uint8Array;
  const file = new File(Paths.cache, "rto-attendance.xlsx");
  file.write(wbout);
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function downloadSampleExcel() {
  const rows = [
    { Date: "2026-05-01", Status: "in-office" },
    { Date: "2026-05-04", Status: "absent" },
    { Date: "2026-05-05", Status: "public-holiday" },
    { Date: "2026-05-06", Status: "in-office" },
    { Date: "2026-05-07", Status: "personal-leave" },
    { Date: "2026-05-08", Status: "sick-leave" },
    { Date: "2026-05-11", Status: "in-office" },
    { Date: "2026-05-12", Status: "in-office" },
  ];
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 14 }, { wch: 20 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const wbout = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Uint8Array;
  const file = new File(Paths.cache, "rto-sample.xlsx");
  file.write(wbout);
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function importFromExcel(): Promise<number> {
  const result = await File.pickFileAsync({
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
  });
  if (result.canceled || !result.result) return 0;

  const content = await result.result.bytes();
  const wb = XLSX.read(content, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return 0;

  const data = XLSX.utils.sheet_to_json<{ Date: string; Status: string }>(ws);
  let count = 0;
  for (const row of data) {
    const status = row.Status?.trim().toLowerCase();
    if (row.Date && status && VALID_STATUSES.has(status as DayStatus)) {
      await db.runAsync(
        "INSERT OR REPLACE INTO days (date, status) VALUES (?, ?)",
        [row.Date, status]
      );
      count++;
    }
  }
  return count;
}
