import { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
} from "date-fns";
import { getAllDays, initDb } from "../db";
import type { DayRecord, MonthStats } from "../types";

function isWorkingDay(d: Date): boolean {
  const dow = d.getDay();
  return dow >= 1 && dow <= 5;
}

function calcMonthStats(
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

function StatItem({
  label,
  value,
  color,
}: Readonly<{
  label: string;
  value: number;
  color?: string;
}>) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text
        style={{
          fontSize: 22,
          fontWeight: "700",
          color: color ?? "#111827",
        }}
      >
        {value}
      </Text>
      <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

function StatCard({
  title,
  stats: s,
  excludeLeaves,
}: Readonly<{
  title: string;
  stats: MonthStats;
  excludeLeaves: boolean;
}>) {
  const pct = excludeLeaves ? s.netInOfficePct : s.inOfficePct;
  const label = excludeLeaves ? "Excluding holidays & leaves" : "Including holidays & leaves";
  const color = excludeLeaves ? "#22c55e" : "#3b82f6";
  const bgTint = excludeLeaves ? "#052e16" : "#0c1929";
  const borderTint = excludeLeaves ? "#22c55e" : "#3b82f6";
  return (
    <View
      style={{
        backgroundColor: bgTint,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: borderTint,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: "600", color: "#94a3b8", marginBottom: 4 }}>
        {title}
      </Text>
      <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 48, fontWeight: "800", color, textAlign: "center" }}>
        {pct}%
      </Text>
      <View style={{ height: 1, backgroundColor: "#1e293b", marginVertical: 12 }} />
      <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
        <StatItem label="In office" value={s.inOfficeDays} color="#22c55e" />
        <StatItem label="Working days" value={excludeLeaves ? s.netWorkingDays : s.totalWorkingDays} color="#94a3b8" />
        {excludeLeaves && <StatItem label="Leaves" value={s.leaveDays} color="#f59e0b" />}
      </View>
    </View>
  );
}

function MonthBreakdownCard({
  month,
  year,
  stats: s,
  excludeLeaves,
}: Readonly<{
  month: number;
  year: number;
  stats: MonthStats;
  excludeLeaves: boolean;
}>) {
  const pct = excludeLeaves ? s.netInOfficePct : s.inOfficePct;
  const color = excludeLeaves ? "#22c55e" : "#3b82f6";
  return (
    <View
      style={{
        backgroundColor: "#1e293b",
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#334155",
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: "700", color: "#f8fafc", marginBottom: 8 }}>
        {format(new Date(year, month - 1), "MMMM yyyy")}
      </Text>

      <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 28, fontWeight: "800", color }}>
            {pct}%
          </Text>
          <Text style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            {excludeLeaves ? "Excl." : "Incl."}
          </Text>
        </View>

        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 22, fontWeight: "700", color: "#f8fafc" }}>
            {s.inOfficeDays}/{excludeLeaves ? s.netWorkingDays : s.totalWorkingDays}
          </Text>
          <Text style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            In / Work
          </Text>
        </View>

        {excludeLeaves && (
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: "#f59e0b" }}>
              {s.leaveDays}
            </Text>
            <Text style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
              Leaves
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function InsightsScreen() {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [excludeLeaves, setExcludeLeaves] = useState(false);

  function prevYear() { setCurrentYear((y) => y - 1); }
  function nextYear() { setCurrentYear((y) => y + 1); }
  const [stats, setStats] = useState<MonthStats | null>(null);
  const [ytdStats, setYtdStats] = useState<MonthStats | null>(null);
  const [monthBreakdown, setMonthBreakdown] = useState<{ month: number; stats: MonthStats }[]>([]);

  useFocusEffect(
    useCallback(() => {
      initDb().then(async () => {
        const records = await getAllDays();

        const monthStats = calcMonthStats(currentYear, currentMonth, records);
        setStats(monthStats);

        const months = Array.from(
          { length: currentMonth },
          (_, i) => i + 1
        );

        const breakdown = months.map((m) => ({
          month: m,
          stats: calcMonthStats(currentYear, m, records),
        }));
        setMonthBreakdown(breakdown);

        const ytd = breakdown.reduce<MonthStats>(
          (acc, { stats: s }) => ({
            totalWorkingDays: acc.totalWorkingDays + s.totalWorkingDays,
            inOfficeDays: acc.inOfficeDays + s.inOfficeDays,
            leaveDays: acc.leaveDays + s.leaveDays,
            inOfficePct: 0,
            netWorkingDays: acc.netWorkingDays + s.netWorkingDays,
            netInOfficePct: 0,
          }),
          {
            totalWorkingDays: 0,
            inOfficeDays: 0,
            leaveDays: 0,
            inOfficePct: 0,
            netWorkingDays: 0,
            netInOfficePct: 0,
          }
        );
        ytd.inOfficePct =
          ytd.totalWorkingDays > 0
            ? Math.round((ytd.inOfficeDays / ytd.totalWorkingDays) * 100)
            : 0;
        ytd.netInOfficePct =
          ytd.netWorkingDays > 0
            ? Math.round((ytd.inOfficeDays / ytd.netWorkingDays) * 100)
            : 0;
        setYtdStats(ytd);
      });
    }, [currentYear, currentMonth])
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0f172a" }}
      contentContainerStyle={{ padding: 16 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#f8fafc" }}>
          Insights
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity onPress={prevYear} style={{ padding: 6 }}>
            <Text style={{ fontSize: 18, color: "#3b82f6" }}>←</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#f8fafc", minWidth: 50, textAlign: "center" }}>
            {currentYear}
          </Text>
          <TouchableOpacity onPress={nextYear} style={{ padding: 6 }}>
            <Text style={{ fontSize: 18, color: "#3b82f6" }}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flexDirection: "row", backgroundColor: "#1e293b", borderRadius: 20, padding: 3, marginBottom: 16, alignSelf: "center" }}>
        <TouchableOpacity
          onPress={() => setExcludeLeaves(false)}
          style={{
            paddingHorizontal: 20,
            paddingVertical: 8,
            borderRadius: 18,
            backgroundColor: excludeLeaves ? "transparent" : "#3b82f6",
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: excludeLeaves ? "#64748b" : "#fff" }}>Incl. holidays</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setExcludeLeaves(true)}
          style={{
            paddingHorizontal: 20,
            paddingVertical: 8,
            borderRadius: 18,
            backgroundColor: excludeLeaves ? "#3b82f6" : "transparent",
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: excludeLeaves ? "#fff" : "#64748b" }}>Excl. holidays</Text>
        </TouchableOpacity>
      </View>

      {stats && <StatCard title={`${format(new Date(currentYear, currentMonth - 1), "MMMM yyyy")}`} stats={stats} excludeLeaves={excludeLeaves} />}
      {ytdStats && <StatCard title="Year to Date" stats={ytdStats} excludeLeaves={excludeLeaves} />}

      {monthBreakdown.map(({ month, stats: s }) => (
        <MonthBreakdownCard key={month} month={month} year={currentYear} stats={s} excludeLeaves={excludeLeaves} />
      ))}
    </ScrollView>
  );
}
