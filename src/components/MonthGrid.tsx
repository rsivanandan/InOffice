import { useState, useMemo, useCallback } from "react";
import { View, Text } from "react-native";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
} from "date-fns";
import DayCell from "./DayCell";
import StatusPicker from "./StatusPicker";
import type { DayRecord, DayStatus } from "../types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Props {
  year: number;
  month: number;
  records: DayRecord[];
  onUpdate: (date: string, status: DayStatus) => void;
}

export default function MonthGrid({ year, month, records, onUpdate }: Readonly<Props>) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");

  const today = new Date();

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(new Date(year, month - 1)));
    const end = endOfWeek(endOfMonth(new Date(year, month - 1)));
    return eachDayOfInterval({ start, end });
  }, [year, month]);

  const recordMap = useMemo(() => {
    const map = new Map<string, DayStatus>();
    for (const r of records) {
      map.set(r.date, r.status);
    }
    return map;
  }, [records]);

  const currentMonth = useMemo(
    () => new Date(year, month - 1).getMonth(),
    [year, month]
  );

  const handlePress = useCallback((dateKey: string) => {
    setSelectedDate(dateKey);
    setPickerVisible(true);
  }, []);

  const handleLongPress = useCallback(
    (dateKey: string) => {
      const current = recordMap.get(dateKey) ?? "absent";
      const next: DayStatus = current === "in-office" ? "absent" : "in-office";
      onUpdate(dateKey, next);
    },
    [recordMap, onUpdate]
  );

  function handleSelect(status: DayStatus) {
    onUpdate(selectedDate, status);
    setPickerVisible(false);
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", marginBottom: 4 }}>
        {WEEKDAYS.map((wd) => (
          <View
            key={wd}
            style={{ flex: 1, alignItems: "center", paddingVertical: 4 }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: wd === "Sun" || wd === "Sat" ? "#64748b" : "#94a3b8",
              }}
            >
              {wd}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ flex: 1 }}>
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <View key={row} style={{ flex: 1, flexDirection: "row" }}>
            {days.slice(row * 7, row * 7 + 7).map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const dayNum = d.getDate();
              const isCurrent = d.getMonth() === currentMonth;
              const status = isCurrent
                ? (recordMap.get(key) ?? "absent")
                : "absent";

              return (
                <DayCell
                  key={key}
                  day={isCurrent ? dayNum : 0}
                  isCurrentMonth={isCurrent}
                  isToday={isSameDay(d, today)}
                  status={status}
                  dateKey={key}
                  onPress={handlePress}
                  onLongPress={handleLongPress}
                />
              );
            })}
          </View>
        ))}
      </View>

      <StatusPicker
        visible={pickerVisible}
        dateLabel={selectedDate}
        onSelect={handleSelect}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}
