export type DayStatus = "in-office" | "absent" | "public-holiday" | "personal-leave" | "sick-leave";

export interface DayRecord {
  date: string; // YYYY-MM-DD
  status: DayStatus;
}

export interface MonthStats {
  totalWorkingDays: number;
  inOfficeDays: number;
  leaveDays: number;
  inOfficePct: number;
  netWorkingDays: number;
  netInOfficePct: number;
}
