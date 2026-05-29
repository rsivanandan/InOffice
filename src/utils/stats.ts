import { format, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";
import type { DayRecord, MonthStats } from "../types";

export function isWorkingDay(d: Date): boolean {
  const dow = d.getDay();
  return dow >= 1 && dow <= 5;
}

export function calcMonthStats(
  year: number,
  month: number,
  records: DayRecord[]
): MonthStats {
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));
  const allDays = eachDayOfInterval({ start, end });

  const recordMap = new Map(records.map((r) => [r.date, r.status]));

  const totalWorkingDays = allDays.filter(isWorkingDay).length;

  let inOfficeDays = 0;
  let leaveDays = 0;

  for (const d of allDays) {
    if (!isWorkingDay(d)) continue;
    const key = format(d, "yyyy-MM-dd");
    const status = recordMap.get(key) ?? "absent";
    if (status === "in-office") inOfficeDays++;
    if (
      status === "public-holiday" ||
      status === "personal-leave" ||
      status === "sick-leave"
    )
      leaveDays++;
  }

  const netWorkingDays = totalWorkingDays - leaveDays;
  const inOfficePct =
    totalWorkingDays > 0
      ? Math.round((inOfficeDays / totalWorkingDays) * 100)
      : 0;
  const netInOfficePct =
    netWorkingDays > 0
      ? Math.round((inOfficeDays / netWorkingDays) * 100)
      : 0;

  return {
    totalWorkingDays,
    inOfficeDays,
    leaveDays,
    inOfficePct,
    netWorkingDays,
    netInOfficePct,
  };
}

export function getPlural(n: number): string {
  return n === 1 ? "" : "s";
}
