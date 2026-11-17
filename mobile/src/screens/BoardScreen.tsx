import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { formatDistanceToNow, isPast } from "date-fns";
import { errorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useOnDataSynced } from "../offline/SyncContext";
import { getCachedTasks } from "../offline/localDb";
import {
  deleteTaskOfflineFirst,
  fetchTasksOfflineFirst,
  updateTaskOfflineFirst,
} from "../offline/offlineApi";
import { Priority, Status, Task } from "../types";
import { colors, radii, shadow } from "../theme";
import {
  Button,
  Chip,
  EmptyState,
  ErrorBanner,
  PriorityBadge,
  ProgressBar,
  Screen,
  Text,
} from "../ui";
import TaskModal from "../components/TaskModal";

const COLUMNS: { id: Status; title: string; short: string; color: string; bg: string }[] = [
  { id: "TODO", title: "To Do", short: "To Do", color: colors.slate400, bg: colors.slate100 },
  { id: "IN_PROGRESS", title: "In Progress", short: "Progress", color: colors.primary, bg: colors.primarySoft },
  { id: "DONE", title: "Done", short: "Done", color: colors.green, bg: colors.greenLight },
];

const PRIORITY_FILTERS: { label: string; value: Priority | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "High", value: "HIGH" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Low", value: "LOW" },
];

const SORTS: { label: string; value: "NEWEST" | "OLDEST" | "DUE_DATE" }[] = [
  { label: "Newest", value: "NEWEST" },
  { label: "Oldest", value: "OLDEST" },
  { label: "Due Date", value: "DUE_DATE" },
];

export default function BoardScreen() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<Priority | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<"NEWEST" | "OLDEST" | "DUE_DATE">("NEWEST");
  const [activeColumn, setActiveColumn] = useState<Status | "ALL">("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<Status>("TODO");

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      const cached = await getCachedTasks(user.id);
      if (cached.length > 0) {
        setTasks(cached);
        setLoading(false);
      }
      const res = await fetchTasksOfflineFirst(user.id);
      setTasks(res.items);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const reloadFromCache = useCallback(async () => {
    if (!user) return;
    setTasks(await getCachedTasks(user.id));
  }, [user]);

  useOnDataSynced(reloadFromCache);

  const filtered = useMemo(() => {
    const list = tasks.filter((t) => priorityFilter === "ALL" || t.priority === priorityFilter);
    return [...list].sort((a, b) => {
      if (sortBy === "NEWEST") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "OLDEST") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [tasks, priorityFilter, sortBy]);

  const openCreate = (status: Status = "TODO") => {
    setEditing(null);
    setDefaultStatus(status);
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setModalOpen(true);
  };

  const updateStatus = async (task: Task, status: Status) => {
    if (!user) return;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
    try {
      const { task: updated } = await updateTaskOfflineFirst(user.id, task, { status });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (e) {
      setError(errorMessage(e));
      load();
    }
  };

  const remove = (task: Task) => {
    if (!user) return;
    Alert.alert("Delete task?", task.title, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setTasks((prev) => prev.filter((t) => t.id !== task.id));
          try {
            await deleteTaskOfflineFirst(user.id, task.id);
          } catch (e) {
            setError(errorMessage(e));
            load();
          }
        },
      },
    ]);
  };

  const columnWidth = Math.max(260, Math.round(width * 0.82));
  const visibleColumns = activeColumn === "ALL" ? COLUMNS : COLUMNS.filter((c) => c.id === activeColumn);

  const renderTask = (task: Task) => {
    const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
    const total = subtasks.length;
    const done = subtasks.filter((st) => st.isCompleted).length;
    const percent = total ? (done / total) * 100 : 0;
    return (
      <Pressable key={task.id} onPress={() => openEdit(task)} style={s.taskCard}>
        <View style={s.taskHead}>
          <Text weight="bold" numberOfLines={2} style={s.taskTitle}>
            {task.title}
          </Text>
          <Text style={s.taskId}>#{task.id.slice(-4).toUpperCase()}</Text>
        </View>

        {task.description ? (
          <Text numberOfLines={2} style={s.taskDesc}>
            {task.description}
          </Text>
        ) : null}

        {total > 0 ? (
          <View style={{ gap: 5 }}>
            <View style={s.subtaskRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Feather name="list" size={11} color={colors.subtle} />
                <Text style={s.subtaskText}>
                  {done}/{total} Subtasks
                </Text>
              </View>
              <Text style={s.subtaskText}>{Math.round(percent)}%</Text>
            </View>
            <ProgressBar value={percent} color={colors.primary} />
          </View>
        ) : null}

        <View style={s.taskMeta}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
            <PriorityBadge value={task.priority} />
            {task.dueDate ? (
              <View style={s.dueChip}>
                <Feather
                  name="clock"
                  size={10}
                  color={isPast(new Date(task.dueDate)) ? colors.danger : colors.subtle}
                />
                <Text
                  style={[s.dueText, isPast(new Date(task.dueDate)) && { color: colors.danger }]}
                  numberOfLines={1}
                >
                  {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                </Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity onPress={() => remove(task)} hitSlop={10} accessibilityLabel={`Delete ${task.title}`}>
            <Feather name="trash-2" size={14} color={colors.slate300} />
          </TouchableOpacity>
        </View>

        <View style={s.moveRow}>
          <Text weight="black" style={s.moveLabel}>
            MOVE
          </Text>
          <View style={{ flexDirection: "row", gap: 5, flexWrap: "wrap" }}>
            {COLUMNS.filter((c) => c.id !== task.status).map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => updateStatus(task, c.id)}
                style={[s.moveBtn, { backgroundColor: c.bg }]}
              >
                <Text weight="bold" style={[s.moveBtnText, { color: c.id === "DONE" ? colors.darkGreen : c.color }]}>
                  {c.short}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Pressable>
    );
  };

  const renderColumn = (col: (typeof COLUMNS)[number], fixedWidth?: number) => {
    const list = filtered.filter((t) => t.status === col.id);
    return (
      <View key={col.id} style={[{ gap: 10 }, fixedWidth ? { width: fixedWidth } : { flex: 1 }]}>
        <View style={s.colHead}>
          <View style={[s.colDot, { backgroundColor: col.color }]} />
          <Text weight="black" style={s.colTitle}>
            {col.title.toUpperCase()}
          </Text>
          <View style={[s.colCount, { backgroundColor: col.bg }]}>
            <Text weight="black" style={[s.colCountText, { color: col.color }]}>
              {list.length}
            </Text>
          </View>
          <TouchableOpacity onPress={() => openCreate(col.id)} style={s.colAdd} accessibilityLabel={`Add to ${col.title}`}>
            <Feather name="plus" size={16} color={colors.slate500} />
          </TouchableOpacity>
        </View>
        <View style={s.colBox}>
          {list.map(renderTask)}
          {list.length === 0 ? (
            <TouchableOpacity onPress={() => openCreate(col.id)} style={s.colEmpty}>
              <View style={s.colEmptyIcon}>
                <Feather name="plus" size={16} color={colors.subtle} />
              </View>
              <Text weight="black" style={s.colEmptyText}>
                ADD TASK HERE
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <Screen
      title="Task Board"
      subtitle={`${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} total`}
      right={
        <Button
          label="New"
          small
          onPress={() => openCreate(activeColumn === "ALL" ? "TODO" : activeColumn)}
          icon={<Feather name="plus" size={15} color={colors.white} />}
        />
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

        <View style={s.segment}>
          <SegmentButton
            label="All"
            count={tasks.length}
            active={activeColumn === "ALL"}
            onPress={() => setActiveColumn("ALL")}
          />
          {COLUMNS.map((col) => (
            <SegmentButton
              key={col.id}
              label={col.short}
              count={tasks.filter((t) => t.status === col.id).length}
              dot={col.color}
              active={activeColumn === col.id}
              onPress={() => setActiveColumn(col.id)}
            />
          ))}
        </View>

        <View style={{ gap: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
            {PRIORITY_FILTERS.map((f) => (
              <Chip
                key={f.value}
                label={f.label}
                selected={priorityFilter === f.value}
                onPress={() => setPriorityFilter(f.value)}
              />
            ))}
            <View style={s.filterDivider} />
            {SORTS.map((sort) => (
              <Chip
                key={sort.value}
                label={sort.label}
                selected={sortBy === sort.value}
                onPress={() => setSortBy(sort.value)}
              />
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <View style={s.emptyWrap}>
            <MaterialCommunityIcons name="flower" size={30} color={colors.green} />
            <Text style={{ color: colors.muted, marginTop: 8 }}>Loading tasks...</Text>
          </View>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={<Feather name="layout" size={28} color={colors.primary} />}
            title="No tasks yet"
            message="Start by adding your first task to see it on the Kanban board."
            actionLabel="Add Task"
            onAction={() => openCreate("TODO")}
          />
        ) : activeColumn === "ALL" ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={columnWidth + 12}
            decelerationRate="fast"
            contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
          >
            {COLUMNS.map((col) => renderColumn(col, columnWidth))}
          </ScrollView>
        ) : (
          <View>{visibleColumns.map((col) => renderColumn(col))}</View>
        )}
      </ScrollView>

      <TaskModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        task={editing}
        defaultStatus={defaultStatus}
        onSaved={(saved, created) => {
          setTasks((prev) => (created ? [saved, ...prev] : prev.map((t) => (t.id === saved.id ? saved : t))));
        }}
        onDeleted={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
      />
    </Screen>
  );
}

function SegmentButton({
  label,
  count,
  active,
  onPress,
  dot,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
  dot?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[s.segmentBtn, active && s.segmentBtnActive]}
    >
      {dot ? <View style={[s.segmentDot, { backgroundColor: dot }]} /> : null}
      <Text weight="black" numberOfLines={1} style={[s.segmentText, active && { color: colors.text }]}>
        {label}
      </Text>
      <Text weight="bold" style={s.segmentCount}>
        ({count})
      </Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 30, gap: 14 },
  segment: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.slate100,
    borderRadius: radii.lg,
    padding: 4,
    gap: 3,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 12,
  },
  segmentBtnActive: { backgroundColor: colors.card, ...shadow, elevation: 1 },
  segmentDot: { width: 6, height: 6, borderRadius: 3 },
  segmentText: { fontSize: 10, color: colors.slate500 },
  segmentCount: { fontSize: 9, color: colors.subtle },
  filterDivider: { width: 1, backgroundColor: colors.slate200, marginHorizontal: 3 },
  emptyWrap: { alignItems: "center", paddingVertical: 40 },
  colHead: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 3 },
  colDot: { width: 9, height: 9, borderRadius: 5 },
  colTitle: { fontSize: 10, color: colors.slate600, letterSpacing: 1 },
  colCount: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  colCountText: { fontSize: 9 },
  colAdd: {
    marginLeft: "auto",
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  colBox: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: 10,
    gap: 10,
    minHeight: 220,
  },
  colEmpty: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.slate200,
    borderRadius: radii.lg,
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  colEmptyIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  colEmptyText: { fontSize: 9, color: colors.subtle, letterSpacing: 1 },
  taskCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    gap: 9,
    ...shadow,
    shadowOpacity: 0.03,
    elevation: 1,
  },
  taskHead: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  taskTitle: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 18 },
  taskId: { fontSize: 9, color: colors.slate300, letterSpacing: 0.3 },
  taskDesc: { fontSize: 11, color: colors.subtle, lineHeight: 16 },
  subtaskRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  subtaskText: { fontSize: 9, color: colors.subtle, letterSpacing: 0.4 },
  taskMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  dueChip: { flexDirection: "row", alignItems: "center", gap: 3, flexShrink: 1 },
  dueText: { fontSize: 9, color: colors.subtle },
  moveRow: {
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  moveLabel: { fontSize: 8, color: colors.slate300, letterSpacing: 1 },
  moveBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9 },
  moveBtnText: { fontSize: 9 },
});
