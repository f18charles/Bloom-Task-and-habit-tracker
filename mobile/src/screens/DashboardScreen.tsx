import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { formatDistanceToNow, isPast } from "date-fns";
import { api, errorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Habit, HabitLog, Priority, Task } from "../types";
import { colors, radii, shadow } from "../theme";
import { loggedToday } from "../utils";
import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorBanner,
  PriorityBadge,
  Screen,
  SectionHeader,
  Text,
} from "../ui";
import TaskModal from "../components/TaskModal";

const PRIORITY_FILTERS: { label: string; value: Priority | "ALL" }[] = [
  { label: "All Priority", value: "ALL" },
  { label: "High", value: "HIGH" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Low", value: "LOW" },
];

export default function DashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<Priority | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<"NEWEST" | "OLDEST" | "DUE_DATE">("NEWEST");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [nextTasks, nextHabits] = await Promise.all([
        api.get<Task[]>("/tasks"),
        api.get<Habit[]>("/habits"),
      ]);
      setTasks(nextTasks);
      setHabits(nextHabits.map((h) => ({ ...h, logs: h.logs ?? [] })));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const pendingTasks = tasks.filter((t) => t.status !== "DONE");
  const pendingHabits = habits.filter((h) => !loggedToday(h));
  const filteredTasks = useMemo(
    () =>
      pendingTasks
        .filter((t) => priorityFilter === "ALL" || t.priority === priorityFilter)
        .sort((a, b) => {
          if (sortBy === "NEWEST") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          if (sortBy === "OLDEST") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        })
        .slice(0, 3),
    [pendingTasks, priorityFilter, sortBy]
  );

  const logHabit = async (habit: Habit) => {
    try {
      const entry = await api.post<HabitLog>(`/habits/${habit.id}/log`);
      setHabits((prev) =>
        prev.map((h) => (h.id === habit.id ? { ...h, logs: [...(h.logs ?? []), entry] } : h))
      );
    } catch (e) {
      if (errorMessage(e).includes("Already logged")) load();
      else setError(errorMessage(e));
    }
  };

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setModalOpen(true);
  };

  const firstName = user?.displayName?.trim().split(/\s+/)[0] || "there";

  if (loading && tasks.length === 0 && habits.length === 0) {
    return (
      <Screen title={`Hi, ${firstName}!`} subtitle="Keep up the great progress.">
        <View style={s.loadingWrap}>
          <MaterialCommunityIcons name="flower" size={34} color={colors.green} />
          <Text style={{ color: colors.muted, marginTop: 10 }}>Loading your day...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title={`Hi, ${firstName}!`}
      subtitle="Keep up the great progress."
      right={
        <TouchableOpacity onPress={() => navigation.navigate("Settings")} accessibilityLabel="Open settings">
          <Avatar name={user?.displayName || "U"} size={38} />
        </TouchableOpacity>
      }
    >
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

        <View style={[s.hero, { backgroundColor: colors.primary }]}>
          <Text weight="black" style={s.heroKickerLight}>
            WORKSPACE STATUS
          </Text>
          <Text weight="black" style={s.heroTitle}>
            Your Focus Area
          </Text>
          <Text style={s.heroBodyLight}>
            You currently have <Text weight="bold" style={s.heroBodyLight}>{pendingTasks.length} tasks</Text>{" "}
            remaining to complete.
          </Text>
        </View>

        <View style={[s.hero, { backgroundColor: colors.emeraldCard }]}>
          <Text weight="black" style={s.heroKickerGreen}>
            DAILY HABITS
          </Text>
          <Text weight="black" style={s.heroTitle}>
            Daily habits
          </Text>
          <Text style={s.heroBodyGreen}>
            {pendingHabits.length > 0
              ? `You have ${pendingHabits.length} habits remaining to log today.`
              : "All habits completed for today! Excellent job."}
          </Text>
        </View>

        <Card>
          <SectionHeader
            title="Daily Habits"
            compact
            right={
              <TouchableOpacity onPress={() => navigation.navigate("Habits")}>
                <Text weight="bold" style={s.link}>
                  View all
                </Text>
              </TouchableOpacity>
            }
          />
          <View style={{ marginTop: 14, gap: 9 }}>
            {habits.length === 0 ? (
              <View style={s.miniEmpty}>
                <Text style={s.miniEmptyText}>No habits set yet blooming!</Text>
                <TouchableOpacity onPress={() => navigation.navigate("Habits")}>
                  <Text weight="black" style={s.miniLink}>
                    SETUP HABITS
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              habits.slice(0, 3).map((habit) => {
                const done = loggedToday(habit);
                return (
                  <View key={habit.id} style={s.habitRow}>
                    <TouchableOpacity
                      onPress={() => !done && logHabit(habit)}
                      disabled={done}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: done }}
                      style={[s.check, done && s.checkDone]}
                    >
                      {done ? <Feather name="check" size={12} color={colors.white} /> : null}
                    </TouchableOpacity>
                    <Text
                      weight="medium"
                      numberOfLines={1}
                      style={[s.habitTitle, done && s.habitDone]}
                    >
                      {habit.title}
                    </Text>
                    <Text weight="black" style={s.habitStatus}>
                      {done ? "DONE" : "PENDING"}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </Card>

        <Card>
          <SectionHeader
            title="Currently Blooming"
            subtitle="Your priority focus"
            compact
            right={
              <TouchableOpacity onPress={() => navigation.navigate("Board")}>
                <Text weight="bold" style={s.link}>
                  View Board
                </Text>
              </TouchableOpacity>
            }
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 14 }}
          >
            {PRIORITY_FILTERS.map((f) => (
              <Chip
                key={f.value}
                label={f.label}
                selected={priorityFilter === f.value}
                onPress={() => setPriorityFilter(f.value)}
              />
            ))}
            <View style={s.filterDivider} />
            {(
              [
                { label: "Newest", value: "NEWEST" },
                { label: "Oldest", value: "OLDEST" },
                { label: "Due date", value: "DUE_DATE" },
              ] as const
            ).map((sort) => (
              <Chip
                key={sort.value}
                label={sort.label}
                selected={sortBy === sort.value}
                onPress={() => setSortBy(sort.value)}
              />
            ))}
          </ScrollView>

          <View style={{ gap: 11 }}>
            {filteredTasks.length === 0 ? (
              <EmptyState
                icon={<MaterialCommunityIcons name="flower" size={30} color={colors.primary} />}
                title="Welcome to Bloom"
                message="Start organizing your workspace by adding your first task."
                actionLabel="Add First Task"
                onAction={openCreate}
              />
            ) : (
              filteredTasks.map((task) => (
                <Pressable key={task.id} onPress={() => openEdit(task)}>
                  <View style={s.taskCard}>
                    <View style={s.taskTop}>
                      <PriorityBadge value={task.priority} />
                      <Text style={s.taskId}>#TSK-{task.id.slice(-3).toUpperCase()}</Text>
                    </View>
                    <Text weight="bold" numberOfLines={1} style={s.taskTitle}>
                      {task.title}
                    </Text>
                    <View style={s.taskBottom}>
                      <View style={s.taskAvatar}>
                        <Text weight="black" style={s.taskAvatarText}>
                          {(user?.displayName || "U").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text weight="black" style={s.taskStatus}>
                        {(task.status === "IN_PROGRESS" ? "In Progress" : task.status === "DONE" ? "Done" : "To Do").toUpperCase()}
                      </Text>
                      {task.dueDate ? (
                        <Text
                          style={[
                            s.taskDue,
                            isPast(new Date(task.dueDate)) && { color: colors.danger },
                          ]}
                        >
                          {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              ))
            )}

            <Pressable onPress={openCreate} style={s.addTask}>
              <Feather name="plus" size={20} color={colors.primary} />
              <Text weight="black" style={s.addTaskText}>
                ADD TASK
              </Text>
            </Pressable>
          </View>
        </Card>
      </ScrollView>

      <TaskModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        task={editing}
        onSaved={(saved, created) => {
          setTasks((prev) => (created ? [saved, ...prev] : prev.map((t) => (t.id === saved.id ? saved : t))));
        }}
        onDeleted={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 30, gap: 16 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: {
    borderRadius: 24,
    padding: 22,
    minHeight: 132,
    justifyContent: "center",
    ...shadow,
  },
  heroKickerLight: { color: colors.slate300, fontSize: 9, letterSpacing: 1.6 },
  heroKickerGreen: { color: colors.greenSoft, fontSize: 9, letterSpacing: 1.6 },
  heroTitle: { color: colors.white, fontSize: 24, letterSpacing: -0.5, marginTop: 4 },
  heroBodyLight: { color: colors.slate100, fontSize: 13, marginTop: 5, lineHeight: 19 },
  heroBodyGreen: { color: colors.greenSoft, fontSize: 13, marginTop: 5, lineHeight: 19 },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  checkDone: { backgroundColor: colors.primary },
  habitTitle: { flex: 1, fontSize: 14, color: colors.text },
  habitDone: { color: colors.subtle, textDecorationLine: "line-through" },
  habitStatus: { fontSize: 9, letterSpacing: 0.6, color: colors.slate600 },
  miniEmpty: { alignItems: "center", paddingVertical: 14, gap: 6 },
  miniEmptyText: { fontSize: 12, color: colors.subtle, fontStyle: "italic" },
  miniLink: { fontSize: 10, color: colors.primary, letterSpacing: 1.2 },
  link: { fontSize: 12, color: colors.primary },
  filterDivider: { width: 1, backgroundColor: colors.slate200, marginHorizontal: 2 },
  taskCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
    gap: 9,
  },
  taskTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  taskId: { fontSize: 10, color: colors.subtle, letterSpacing: 0.3 },
  taskTitle: { fontSize: 15, color: colors.text },
  taskBottom: { flexDirection: "row", alignItems: "center", gap: 7 },
  taskAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  taskAvatarText: { fontSize: 8, color: colors.primary },
  taskStatus: { fontSize: 9, color: colors.slate600, letterSpacing: 0.7 },
  taskDue: { fontSize: 9, color: colors.subtle, marginLeft: "auto" },
  addTask: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  addTaskText: { fontSize: 10, color: colors.slate600, letterSpacing: 1.1 },
});
