import { memo } from "react";
import { TouchableOpacity, Text, View } from "react-native";
import type { DayStatus } from "../types";

const OOO_COLORS: Record<DayStatus, string> = {
  "in-office": "",
  absent: "",
  "public-holiday": "#ec4899",
  "personal-leave": "#3b82f6",
  "sick-leave": "#ef4444",
};

const TILE_COLORS: Record<DayStatus, string> = {
  "in-office": "#22c55e",
  absent: "transparent",
  "public-holiday": "transparent",
  "personal-leave": "transparent",
  "sick-leave": "transparent",
};

const LABEL: Record<DayStatus, string | null> = {
  "in-office": null,
  absent: null,
  "public-holiday": "H",
  "personal-leave": "L",
  "sick-leave": "S",
};

const isOoo = (s: DayStatus) => s === "public-holiday" || s === "personal-leave" || s === "sick-leave";

function getBgColor(ooo: boolean, isToday: boolean, status: DayStatus): string {
  if (ooo) return OOO_COLORS[status];
  if (isToday) return "#1e3a5f";
  return "#1e293b";
}

function getBorderColor(isToday: boolean, ooo: boolean): string {
  if (isToday) return "#3b82f6";
  if (ooo) return "transparent";
  return "transparent";
}

function getBorderWidth(isToday: boolean, ooo: boolean): number {
  if (isToday && !ooo) return 2;
  if (ooo) return 0;
  return 0;
}

function getTextColor(ooo: boolean): string {
  return ooo ? "#fff" : "#f8fafc";
}

function getLabelColor(ooo: boolean): string {
  return ooo ? "rgba(255,255,255,0.7)" : "#64748b";
}

interface Props {
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  status: DayStatus;
  dateKey: string;
  onPress: (key: string) => void;
  onLongPress: (key: string) => void;
}

const DayCell = memo(function DayCell({
  day,
  isCurrentMonth,
  isToday,
  status,
  dateKey,
  onPress,
  onLongPress,
}: Readonly<Props>) {
  if (day === 0) {
    return <View style={{ flex: 1, margin: 1 }} />;
  }

  const ooo = isOoo(status);
  const bgColor = getBgColor(ooo, isToday, status);
  const borderColor = getBorderColor(isToday, ooo);
  const borderWidth = getBorderWidth(isToday, ooo);
  const textColor = getTextColor(ooo);
  const labelColor = getLabelColor(ooo);
  const letter = LABEL[status];
  const fontWeight = isToday ? "700" : "600";
  const opacity = isCurrentMonth ? 1 : 0.3;
  const tileMarginTop = letter ? 1 : 3;

  return (
    <TouchableOpacity
      onPress={() => onPress(dateKey)}
      onLongPress={() => onLongPress(dateKey)}
      style={{
        flex: 1,
        margin: 1,
        borderRadius: 8,
        backgroundColor: bgColor,
        borderWidth,
        borderColor,
        alignItems: "center",
        justifyContent: "center",
        opacity,
      }}
    >
      <Text style={{ fontSize: 17, fontWeight, color: textColor }}>
        {day}
      </Text>

      {letter && (
        <Text style={{ fontSize: 8, color: labelColor, marginTop: 1 }}>
          {letter}
        </Text>
      )}

      {!ooo && (
        <View
          style={{
            width: 24,
            height: 6,
            borderRadius: 3,
            backgroundColor: TILE_COLORS[status],
            marginTop: tileMarginTop,
          }}
        />
      )}
    </TouchableOpacity>
  );
});

export default DayCell;
