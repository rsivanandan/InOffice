import { useState, useRef, useEffect, useCallback, useContext } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { TabIndexContext } from "../utils/TabIndexContext";
import { format, addMonths, subMonths } from "date-fns";
import MonthGrid from "../components/MonthGrid";
import { getMonthDays, setDayStatus, initDb } from "../db";
import type { DayRecord, DayStatus } from "../types";

const MY_INDEX = 1;

export default function CalendarScreen() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [records, setRecords] = useState<DayRecord[]>([]);
  const tabIndex = useContext(TabIndexContext);
  const cancelledRef = useRef(false);

  async function loadRecords() {
    const data = await getMonthDays(year, month);
    if (!cancelledRef.current) setRecords(data);
  }

  useEffect(() => {
    if (tabIndex !== MY_INDEX) return;
    cancelledRef.current = false;
    initDb()
      .then(() => {
        if (!cancelledRef.current) loadRecords();
      })
      .catch(() => {});
    return () => {
      cancelledRef.current = true;
    };
  }, [tabIndex, year, month]);

  const handleUpdate = useCallback(
    async (date: string, status: DayStatus) => {
      await setDayStatus(date, status);
      await loadRecords();
    },
    [year, month, loadRecords]
  );

  function prevMonth() {
    const d = subMonths(new Date(year, month - 1), 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }

  function nextMonth() {
    const d = addMonths(new Date(year, month - 1), 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }

  function goToday() {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const todayRecord = records.find((r) => r.date === today);
  const isTodayMarked = todayRecord?.status === "in-office";

  return (
    <View style={{ flex: 1, backgroundColor: "#0f172a", paddingTop: 4 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <TouchableOpacity onPress={prevMonth} style={{ padding: 8 }}>
          <Text style={{ fontSize: 22, color: "#3b82f6" }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#f8fafc" }}>
          {format(new Date(year, month - 1), "MMMM yyyy")}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={{ padding: 8 }}>
          <Text style={{ fontSize: 22, color: "#3b82f6" }}>→</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={goToday} style={{ alignItems: "center", paddingVertical: 6, marginBottom: 4 }}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: "#60a5fa" }}>Jump to Today</Text>
      </TouchableOpacity>

      <View style={{ flex: 1, paddingHorizontal: 12 }}>
        <MonthGrid
          year={year}
          month={month}
          records={records}
          onUpdate={handleUpdate}
        />
      </View>

      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <TouchableOpacity
          onPress={() => handleUpdate(today, "in-office")}
          disabled={isTodayMarked}
          style={{
            backgroundColor: "#22c55e",
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
            {isTodayMarked ? "✓ Marked for today" : "Mark Today as In Office"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
