import { useState, useCallback, memo, useEffect, useRef, useContext } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { TabIndexContext } from "../utils/TabIndexContext";
import { format, isFuture, isToday, endOfMonth, eachDayOfInterval } from "date-fns";
import type { MonthStats, DayRecord } from "../types";
import { getSetting, getDay, getAllDays, setDayStatus, initDb } from "../db";
import { isWorkingDay, calcMonthStats, getPlural } from "../utils/stats";
import StatItem from "../components/StatItem";

const MY_INDEX = 0;

function getGreeting(hour: number): string {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

function getPct(stats: MonthStats | null, excludeLeaves: boolean): number {
  if (!stats) return 0;
  const denom = excludeLeaves ? stats.netWorkingDays : stats.totalWorkingDays;
  if (denom === 0) return 0;
  return Math.round((stats.inOfficeDays / denom) * 100);
}

const ProgressRing = memo(function ProgressRing({ pct, target, size = 110 }: Readonly<{ pct: number; target: number; size?: number }>) {
  const fillPct = Math.min((Math.min(pct, 100) / target) * 100, 100);
  const half = size / 2;
  const stroke = 8;
  const color = pct >= target ? "#22c55e" : "#3b82f6";

  const rightAngle = fillPct <= 50 ? 225 - (fillPct / 50) * 180 : 45;
  const leftAngle = fillPct > 50 ? 45 + ((fillPct - 50) / 50) * 180 : 45;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View style={{
        width: size, height: size, borderRadius: half,
        borderWidth: stroke, borderColor: "#334155", position: "absolute",
      }} />

      <View style={{
        position: "absolute", top: 0, left: half, width: half, height: size, overflow: "hidden",
      }}>
        <View style={{
          position: "absolute", top: 0, left: -half, width: size, height: size,
          borderRadius: half, borderWidth: stroke,
          borderColor: "transparent",
          borderTopColor: color,
          borderRightColor: color,
          transform: [{ rotate: `${rightAngle}deg` }],
        }} />
      </View>

      <View style={{
        position: "absolute", top: 0, left: 0, width: half, height: size, overflow: "hidden",
      }}>
        <View style={{
          position: "absolute", top: 0, left: 0, width: size, height: size,
          borderRadius: half, borderWidth: stroke,
          borderColor: "transparent",
          borderTopColor: color,
          borderRightColor: color,
          transform: [{ rotate: `${leftAngle}deg` }],
        }} />
      </View>

      <View style={{ position: "absolute", alignItems: "center" }}>
        <Text style={{ fontSize: 26, fontWeight: "700", color: "#f8fafc" }}>{pct}%</Text>
        <Text style={{ fontSize: 11, fontWeight: "500", color: "#94a3b8", marginTop: -1 }}>
          of {target}% target
        </Text>
      </View>
    </View>
  );
});

const InclExclToggle = memo(function InclExclToggle({
  excludeLeaves,
  onChange,
}: Readonly<{
  excludeLeaves: boolean;
  onChange: (v: boolean) => void;
}>) {
  return (
    <View style={{ flexDirection: "row", backgroundColor: "#1e293b", borderRadius: 16, padding: 2, marginBottom: 16, alignSelf: "center" }}>
      <TouchableOpacity
        onPress={() => onChange(false)}
        style={{
          paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14,
          backgroundColor: excludeLeaves ? "transparent" : "#3b82f6",
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "600", color: excludeLeaves ? "#64748b" : "#fff" }}>Incl.</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onChange(true)}
        style={{
          paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14,
          backgroundColor: excludeLeaves ? "#3b82f6" : "transparent",
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "600", color: excludeLeaves ? "#fff" : "#64748b" }}>Excl.</Text>
      </TouchableOpacity>
    </View>
  );
});

const TargetStatus = memo(function TargetStatus({
  stillNeed,
  remainingDays,
  targetPct,
}: Readonly<{
  stillNeed: number;
  remainingDays: number;
  targetPct: number;
}>) {
  if (stillNeed <= 0) {
    return (
      <Text style={{ fontSize: 13, color: "#22c55e", textAlign: "center", fontWeight: "600" }}>
        ✓ Met your {targetPct}% target
      </Text>
    );
  }
  const remainSuffix = remainingDays === 1 ? "s" : "";
  const suffix = remainingDays > 0
    ? ` ${remainingDays} working day${getPlural(remainingDays)} remain${remainSuffix} this month.`
    : "";
  return (
    <Text style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", lineHeight: 18, fontWeight: "400" }}>
      You need <Text style={{ fontWeight: "700", color: "#f8fafc" }}>{stillNeed}</Text> more day{getPlural(stillNeed)} in the office.
      {suffix}
    </Text>
  );
});

const DashboardHeader = memo(function DashboardHeader({
  isMarked,
  timeGreeting,
  userName,
  onMarkToday,
}: Readonly<{
  isMarked: boolean;
  timeGreeting: string;
  userName: string;
  onMarkToday: () => void;
}>) {
  const greeting = userName ? `Good ${timeGreeting}, ${userName}` : `Good ${timeGreeting}`;
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: "800", color: "#f8fafc" }}>
          {isMarked ? "Marked for today" : "Not marked for today"}
        </Text>
        <Text style={{ fontSize: 13, fontWeight: "400", color: "#64748b", marginTop: 2, lineHeight: 16 }}>
          {isMarked
            ? `${greeting} — another productive day.`
            : `Tap to log your day, ${userName || "friend"}.`}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onMarkToday}
        disabled={isMarked}
        activeOpacity={0.85}
        style={{
          backgroundColor: "#22c55e",
          paddingVertical: 12,
          borderRadius: 10,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
          {isMarked ? "✓ Marked for today" : "Mark Today as In Office"}
        </Text>
      </TouchableOpacity>
    </View>
  );
});

function calcYtdStats(
  year: number,
  month: number,
  records: DayRecord[]
): MonthStats {
  const acc: MonthStats = { totalWorkingDays: 0, inOfficeDays: 0, leaveDays: 0, inOfficePct: 0, netWorkingDays: 0, netInOfficePct: 0 };
  for (let m = 1; m <= month; m++) {
    const s = calcMonthStats(year, m, records);
    acc.totalWorkingDays += s.totalWorkingDays;
    acc.inOfficeDays += s.inOfficeDays;
    acc.leaveDays += s.leaveDays;
    acc.netWorkingDays += s.netWorkingDays;
  }
  acc.inOfficePct = acc.totalWorkingDays > 0 ? Math.round((acc.inOfficeDays / acc.totalWorkingDays) * 100) : 0;
  acc.netInOfficePct = acc.netWorkingDays > 0 ? Math.round((acc.inOfficeDays / acc.netWorkingDays) * 100) : 0;
  return acc;
}

export default function DashboardScreen() {
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const [todayStatus, setTodayStatus] = useState<string | null>(null);
  const [stats, setStats] = useState<MonthStats | null>(null);
  const [ytdStats, setYtdStats] = useState<MonthStats | null>(null);
  const [targetPct, setTargetPct] = useState(60);
  const [excludeLeaves, setExcludeLeaves] = useState(false);
  const [userName, setUserName] = useState("");
  const [viewDate, setViewDate] = useState(now);
  const tabIndex = useContext(TabIndexContext);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (tabIndex !== MY_INDEX) return;
    cancelledRef.current = false;
    const n = new Date();
    const ts = format(n, "yyyy-MM-dd");
    initDb()
      .then(async () => {
        if (cancelledRef.current) return;
        const day = await getDay(ts);
        if (cancelledRef.current) return;
        setTodayStatus(day?.status ?? null);
        const target = await getSetting("targetPct");
        if (cancelledRef.current) return;
        setTargetPct(target ? Number.parseInt(target, 10) : 60);
        const name = await getSetting("userName");
        if (cancelledRef.current) return;
        if (name) setUserName(name);
        const allRecords = await getAllDays();
        if (cancelledRef.current) return;
        const vyear = viewDate.getFullYear();
        const vmonth = viewDate.getMonth() + 1;
        setStats(calcMonthStats(vyear, vmonth, allRecords));
        setYtdStats(calcYtdStats(n.getFullYear(), n.getMonth() + 1, allRecords));
      })
      .catch(() => {});
    return () => {
      cancelledRef.current = true;
    };
  }, [tabIndex, viewDate]);

  async function markToday() {
    await setDayStatus(todayStr, "in-office");
    const day = await getDay(todayStr);
    setTodayStatus(day?.status ?? null);
  }

  const pct = getPct(stats, excludeLeaves);
  const workingDaysTotal = excludeLeaves && stats ? stats.netWorkingDays : (stats?.totalWorkingDays ?? 0);
  const targetNeed = Math.ceil(workingDaysTotal * targetPct / 100);
  const stillNeed = Math.max(0, targetNeed - (stats?.inOfficeDays ?? 0));

  const viewingCurrentMonth =
    viewDate.getMonth() === now.getMonth() && viewDate.getFullYear() === now.getFullYear();
  const viewIsPast = viewDate < new Date(now.getFullYear(), now.getMonth(), 1);
  let remainingDays = 0;
  if (stats) {
    if (viewingCurrentMonth) {
      remainingDays = eachDayOfInterval({ start: now, end: endOfMonth(now) }).filter(
        (d) => isFuture(d) || isToday(d)
      ).filter(isWorkingDay).length;
    } else if (!viewIsPast) {
      remainingDays = stats.totalWorkingDays;
    }
  }
  const isMarked = todayStatus === "in-office";

  const hour = now.getHours();
  const timeGreeting = getGreeting(hour);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0f172a" }} contentContainerStyle={{ paddingBottom: 160 }}>
      <Text style={{ paddingHorizontal: 20, paddingTop: 8, fontSize: 11, fontWeight: "500", color: "#64748b", letterSpacing: 1, textTransform: "uppercase" }}>
        {format(now, "EEEE, MMMM d")}
      </Text>

      <DashboardHeader isMarked={isMarked} timeGreeting={timeGreeting} userName={userName} onMarkToday={markToday} />

      {stats && (
        <View
          style={{
            marginHorizontal: 20,
            backgroundColor: "#1e293b",
            borderRadius: 20,
            paddingVertical: 20,
            paddingHorizontal: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: "#334155",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 4, gap: 20 }}>
            <TouchableOpacity onPress={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} style={{ padding: 4 }}>
              <Text style={{ fontSize: 18, color: "#3b82f6" }}>←</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setViewDate(now)} disabled={viewingCurrentMonth}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: viewingCurrentMonth ? "#f8fafc" : "#3b82f6" }}>
                {format(viewDate, "MMMM yyyy")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} style={{ padding: 4 }}>
              <Text style={{ fontSize: 18, color: "#3b82f6" }}>→</Text>
            </TouchableOpacity>
          </View>

          <InclExclToggle excludeLeaves={excludeLeaves} onChange={setExcludeLeaves} />

          <View style={{ flexDirection: "row", alignItems: "center", gap: 24 }}>
            <View style={{ flex: 1, alignItems: "center" }}>
              <ProgressRing pct={pct} target={targetPct} size={110} />
            </View>
            <View style={{ flex: 1, gap: 10 }}>
              <View>
                <Text style={{ fontSize: 32, fontWeight: "700", color: "#f8fafc" }}>
                  {stats.inOfficeDays}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: "500", color: "#94a3b8", marginTop: 2 }}>
                  of {excludeLeaves ? stats.netWorkingDays : stats.totalWorkingDays} working days
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 22, fontWeight: "700", color: "#3b82f6" }}>
                  {remainingDays}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: "500", color: "#64748b", marginTop: 1 }}>
                  day{getPlural(remainingDays)} left
                </Text>
              </View>
              {excludeLeaves && stats.leaveDays > 0 && (
                <View>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: "#f59e0b" }}>
                    {stats.leaveDays}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: "500", color: "#64748b", marginTop: 1 }}>
                    leave{getPlural(stats.leaveDays)} taken
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: "#334155", marginVertical: 12 }} />

          <TargetStatus stillNeed={stillNeed} remainingDays={remainingDays} targetPct={targetPct} />
        </View>
      )}

      {ytdStats && (
        <View style={{
          marginHorizontal: 20,
          backgroundColor: "#0c1929",
          borderRadius: 16,
          padding: 16,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: "#3b82f6",
        }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#94a3b8", marginBottom: 8 }}>
            Year to Date — {format(now, "yyyy")}
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
            <StatItem
              label={excludeLeaves ? "Excl." : "Incl."}
              value={`${excludeLeaves ? ytdStats.netInOfficePct : ytdStats.inOfficePct}%`}
              color={excludeLeaves ? "#22c55e" : "#3b82f6"}
              valueSize={28}
            />
            <StatItem label="In office" value={ytdStats.inOfficeDays} color="#f8fafc" />
            <StatItem
              label="Working days"
              value={excludeLeaves ? ytdStats.netWorkingDays : ytdStats.totalWorkingDays}
              color="#f8fafc"
            />
            {excludeLeaves && <StatItem label="Leaves" value={ytdStats.leaveDays} color="#f59e0b" />}
          </View>
        </View>
      )}

    </ScrollView>
  );
}
