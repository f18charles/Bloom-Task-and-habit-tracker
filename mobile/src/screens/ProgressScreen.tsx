import React, { useCallback, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";
import { api, errorMessage } from "../api/client";
import { StatsDay, UserStats } from "../types";
import { colors, fonts } from "../theme";
import { Card, ErrorBanner, Screen, Text } from "../ui";

const CHART_HEIGHT = 158;
const LINE_COLOR = "#86efac";

export default function ProgressScreen() {
  const { width } = useWindowDimensions();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setStats(await api.get<UserStats>("/users/stats"));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const chartWidth = Math.max(180, width - 76);
  const taskData = stats?.taskHistory ?? [];
  const habitData = stats?.habitHistory ?? [];

  return (
    <Screen title="Progress" subtitle="Your growth at a glance.">
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {error ? <ErrorBanner message={error} onRetry={load} /> : null}

        {loading ? (
          <View style={s.loadingWrap}>
            <MaterialCommunityIcons name="flower" size={30} color={colors.green} />
            <Text style={{ color: colors.muted, marginTop: 8 }}>Crunching your numbers...</Text>
          </View>
        ) : (
          <>
            <Card>
              <Text weight="bold" style={s.cardTitle}>Tasks Completed</Text>
              <Text style={s.cardSub}>Last 7 days</Text>
              <View style={{ marginTop: 16 }}>
                <LineChart data={taskData} width={chartWidth} color={LINE_COLOR} />
                <DayLabels data={taskData} />
              </View>
            </Card>

            <Card>
              <Text weight="bold" style={s.cardTitle}>Habit Consistency</Text>
              <Text style={s.cardSub}>Last 7 days</Text>
              <View style={{ marginTop: 18 }}>
                <BarChart data={habitData} />
                <DayLabels data={habitData} />
              </View>
            </Card>

            <View style={s.summaryRow}>
              <View style={s.summaryCard}>
                <Text weight="black" style={s.summaryValue}>{stats?.tasksCompleted ?? 0}</Text>
                <Text weight="black" style={s.summaryLabel}>TASKS COMPLETED</Text>
              </View>
              <View style={s.summaryCard}>
                <Text weight="black" style={s.summaryValue}>{stats?.habitsActive ?? 0}</Text>
                <Text weight="black" style={s.summaryLabel}>ACTIVE HABITS</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function LineChart({ data, width, color }: { data: StatsDay[]; width: number; color: string }) {
  if (data.length === 0) return null;
  const max = Math.max(1, ...data.map((d) => d.count));
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const top = 16;
  const bottom = CHART_HEIGHT - 10;
  const points = data.map((d, i) => {
    const x = i * step;
    const y = bottom - (d.count / max) * (bottom - top);
    return { x, y, count: d.count };
  });
  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <Svg width={width} height={CHART_HEIGHT}>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = bottom - t * (bottom - top);
        return (
          <Line
            key={t}
            x1={0}
            y1={y}
            x2={width}
            y2={y}
            stroke={colors.slate100}
            strokeWidth={1}
            strokeDasharray={t === 0 ? undefined : "3 4"}
          />
        );
      })}
      <Polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={3.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => (
        <React.Fragment key={i}>
          <Circle cx={p.x} cy={p.y} r={4} fill={color} stroke={colors.white} strokeWidth={2} />
          <SvgText
            x={p.x}
            y={p.y - 10}
            fontSize={9}
            fill={colors.slate400}
            fontFamily={fonts.semibold}
            textAnchor="middle"
          >
            {p.count}
          </SvgText>
        </React.Fragment>
      ))}
    </Svg>
  );
}

function BarChart({ data }: { data: StatsDay[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const areaHeight = 132;
  return (
    <View style={s.barArea}>
      {[0, 0.5, 1].map((t) => (
        <View key={t} style={[s.barGrid, { bottom: 24 + t * areaHeight }]} />
      ))}
      {data.map((d, i) => {
        const h = Math.max(4, (d.count / max) * areaHeight);
        return (
          <View key={`${d.day}-${i}`} style={s.barCol}>
            <Text weight="black" style={s.barValue}>{d.count}</Text>
            <View style={{ height: areaHeight, justifyContent: "flex-end" }}>
              <View style={[s.bar, { height: h }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function DayLabels({ data }: { data: StatsDay[] }) {
  return (
    <View style={s.labelRow}>
      {data.map((d, i) => (
        <Text key={`${d.day}-${i}`} style={s.dayLabel}>
          {d.day}
        </Text>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 30, gap: 16 },
  loadingWrap: { alignItems: "center", paddingVertical: 60 },
  cardTitle: { fontSize: 19, color: colors.text, letterSpacing: -0.3 },
  cardSub: { fontSize: 11, color: colors.subtle, marginTop: 2 },
  labelRow: { flexDirection: "row", marginTop: 6 },
  dayLabel: { flex: 1, textAlign: "center", fontSize: 10, color: colors.subtle },
  barArea: {
    height: 156,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingBottom: 0,
  },
  barGrid: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.slate100,
  },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  barValue: { fontSize: 9, color: colors.slate400 },
  bar: {
    width: 18,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: "#86efac",
  },
  summaryRow: { flexDirection: "row", gap: 12 },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 18,
    paddingHorizontal: 14,
  },
  summaryValue: { fontSize: 26, color: colors.text, letterSpacing: -0.5 },
  summaryLabel: { fontSize: 8, color: colors.subtle, letterSpacing: 1.1, marginTop: 3 },
});
