import { View, Text } from "react-native";

export default function StatItem({
  label,
  value,
  color,
  valueSize,
}: Readonly<{
  label: string;
  value: number | string;
  color?: string;
  valueSize?: number;
}>) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontSize: valueSize ?? 22, fontWeight: "700", color: color ?? "#111827" }}>
        {value}
      </Text>
      <Text style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}
