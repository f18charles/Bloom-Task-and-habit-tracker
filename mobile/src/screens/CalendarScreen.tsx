import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { errorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useOnDataSynced } from "../offline/SyncContext";
import { getCachedEvents, getCachedTasks } from "../offline/localDb";
import { fetchEventsOfflineFirst, fetchTasksOfflineFirst } from "../offline/offlineApi";
import { AppEvent, Task } from "../types";
import { colors, radii, shadow } from "../theme";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  PriorityBadge,
  Screen,
  SectionHeader,
  Text,
} from "../ui";
import EventModal from "../components/EventModal";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarScreen() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      const [cachedEvents, cachedTasks] = await Promise.all([
        getCachedEvents(user.id),
        getCachedTasks(user.id),
      ]);
      if (cachedEvents.length > 0 || cachedTasks.length > 0) {
        setEvents(cachedEvents);
        setTasks(cachedTasks);
        setLoading(false);
      }

      const [nextEvents, nextTasks] = await Promise.all([
        fetchEventsOfflineFirst(user.id),
        fetchTasksOfflineFirst(user.id),
      ]);
      setEvents(nextEvents.items);
      setTasks(nextTasks.items);
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
    const [cachedEvents, cachedTasks] = await Promise.all([
      getCachedEvents(user.id),
      getCachedTasks(user.id),
    ]);
    setEvents(cachedEvents);
    setTasks(cachedTasks);
  }, [user]);

  useOnDataSynced(reloadFromCache);

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentMonth)),
        end: endOfWeek(endOfMonth(currentMonth)),
      }),
    [currentMonth]
  );

  const eventsOn = (date: Date) => events.filter((e) => isSameDay(new Date(e.startTime), date));
  const tasksOn = (date: Date) =>
    tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), date));

  const selectedEvents = eventsOn(selectedDate);
  const selectedTasks = tasksOn(selectedDate);

  const openCreate = () => {
    setEditingEvent(null);
    setModalOpen(true);
  };

  const openEvent = (event: AppEvent) => {
    setEditingEvent(event);
    setSelectedDate(new Date(event.startTime));
    setModalOpen(true);
  };

  const today = new Date();

  return (
    <Screen title="Calendar" subtitle="Plan your month.">
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

        <Card>
          <View style={s.monthHead}>
            <View style={{ flex: 1 }}>
              <Text weight="black" style={s.monthTitle}>
                {format(currentMonth, "MMMM yyyy")}
              </Text>
              <Text style={s.monthSub}>Plan your events and view your tasks inline.</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <TouchableOpacity
                onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}
                style={s.navBtn}
                accessibilityLabel="Previous month"
              >
                <Feather name="chevron-left" size={18} color={colors.slate600} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}
                style={s.navBtn}
                accessibilityLabel="Next month"
              >
                <Feather name="chevron-right" size={18} color={colors.slate600} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.legend}>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: colors.sky }]} />
              <Text weight="bold" style={s.legendText}>Events</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: colors.primary }]} />
              <Text weight="bold" style={s.legendText}>Tasks</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setCurrentMonth(new Date());
                setSelectedDate(new Date());
              }}
              style={s.todayBtn}
            >
              <Text weight="black" style={s.todayText}>TODAY</Text>
            </TouchableOpacity>
          </View>

          <Button
            label="New Event"
            onPress={openCreate}
            icon={<Feather name="plus" size={16} color={colors.white} />}
            style={{ marginTop: 14 }}
          />
        </Card>

        <Card style={{ padding: 12 }}>
          <View style={s.weekRow}>
            {WEEKDAYS.map((d) => (
              <Text key={d} weight="black" style={s.weekday}>
                {d.toUpperCase()}
              </Text>
            ))}
          </View>

          <View style={s.grid}>
            {days.map((day) => {
              const inMonth = isSameMonth(day, currentMonth);
              const selected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, today);
              const dayEvents = eventsOn(day);
              const dayTasks = tasksOn(day);
              return (
                <View key={day.toISOString()} style={s.dayCellWrap}>
                  <Pressable
                    onPress={() => setSelectedDate(day)}
                    style={[
                      s.dayCell,
                      selected && { backgroundColor: colors.primary },
                      !selected && isToday && { borderWidth: 1, borderColor: colors.green },
                    ]}
                  >
                    <Text
                      weight={selected || isToday ? "black" : "semibold"}
                      style={[
                        s.dayNum,
                        !inMonth && { color: colors.slate300 },
                        selected && { color: colors.white },
                        !selected && isToday && { color: colors.darkGreen },
                      ]}
                    >
                      {format(day, "d")}
                    </Text>
                    <View style={s.dots}>
                      {dayEvents.slice(0, 2).map((e) => (
                        <View
                          key={e.id}
                          style={[
                            s.dot,
                            { backgroundColor: selected ? colors.white : colors.sky },
                          ]}
                        />
                      ))}
                      {dayTasks.slice(0, 1).map((t) => (
                        <View
                          key={t.id}
                          style={[
                            s.dot,
                            { backgroundColor: selected ? colors.slate300 : colors.primary },
                          ]}
                        />
                      ))}
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </Card>

        <SectionHeader
          title={format(selectedDate, "EEEE, MMM d")}
          subtitle={`${selectedEvents.length} events · ${selectedTasks.length} tasks`}
          right={
            <TouchableOpacity onPress={openCreate}>
              <Text weight="bold" style={s.addLink}>+ Add</Text>
            </TouchableOpacity>
          }
        />

        {selectedEvents.length === 0 && selectedTasks.length === 0 ? (
          <EmptyState
            icon={<Feather name="calendar" size={28} color={colors.primary} />}
            title="Nothing planned"
            message="This day is clear. Add an event or schedule a task."
            actionLabel="New Event"
            onAction={openCreate}
          />
        ) : (
          <View style={{ gap: 9 }}>
            {selectedEvents.map((event) => (
              <Pressable key={event.id} onPress={() => openEvent(event)} style={s.eventRow}>
                <View style={s.eventIcon}>
                  <MaterialCommunityIcons name="calendar-clock" size={18} color={colors.sky} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text weight="bold" numberOfLines={1} style={s.eventTitle}>
                    {event.title}
                  </Text>
                  <Text style={s.eventMeta}>
                    {event.allDay
                      ? "All day"
                      : `${format(new Date(event.startTime), "h:mm a")}${
                          event.endTime ? ` – ${format(new Date(event.endTime), "h:mm a")}` : ""
                        }`}
                  </Text>
                  {event.description ? (
                    <Text numberOfLines={1} style={s.eventDesc}>{event.description}</Text>
                  ) : null}
                </View>
                <Feather name="chevron-right" size={16} color={colors.slate300} />
              </Pressable>
            ))}

            {selectedTasks.map((task) => (
              <View key={task.id} style={s.taskRow}>
                <View style={[s.taskIcon, { backgroundColor: colors.primaryLight }]}>
                  <Feather name="check-square" size={17} color={colors.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    weight="bold"
                    numberOfLines={1}
                    style={[s.eventTitle, task.status === "DONE" && { color: colors.subtle, textDecorationLine: "line-through" }]}
                  >
                    {task.title}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                    <PriorityBadge value={task.priority} />
                    <Text style={s.eventMeta}>{task.status.replace("_", " ")}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {loading ? (
          <View style={s.loadingRow}>
            <MaterialCommunityIcons name="flower" size={26} color={colors.green} />
            <Text style={{ color: colors.muted, marginLeft: 8 }}>Loading calendar...</Text>
          </View>
        ) : null}
      </ScrollView>

      <EventModal
        visible={modalOpen}
        date={selectedDate}
        event={editingEvent}
        onClose={() => setModalOpen(false)}
        onSaved={(saved, created) => {
          setEvents((prev) => (created ? [...prev, saved] : prev.map((e) => (e.id === saved.id ? saved : e))));
          setSelectedDate(new Date(saved.startTime));
        }}
        onDeleted={(id) => setEvents((prev) => prev.filter((e) => e.id !== id))}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 30, gap: 16 },
  monthHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  monthTitle: { fontSize: 26, color: colors.text, letterSpacing: -0.6 },
  monthSub: { fontSize: 12, color: colors.subtle, marginTop: 2 },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 10, color: colors.slate600 },
  todayBtn: { marginLeft: "auto", backgroundColor: colors.card, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  todayText: { fontSize: 9, color: colors.primary, letterSpacing: 0.8 },
  weekRow: { flexDirection: "row", paddingVertical: 6 },
  weekday: { width: `${100 / 7}%`, textAlign: "center", fontSize: 9, color: colors.subtle, letterSpacing: 0.5 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayCellWrap: { width: `${100 / 7}%`, padding: 2 },
  dayCell: {
    aspectRatio: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    gap: 2,
  },
  dayNum: { fontSize: 12, color: colors.text },
  dots: { flexDirection: "row", gap: 2, height: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  addLink: { fontSize: 12, color: colors.primary },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    ...shadow,
    shadowOpacity: 0.03,
    elevation: 1,
  },
  eventIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.skyLight,
    alignItems: "center",
    justifyContent: "center",
  },
  taskIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  eventTitle: { fontSize: 14, color: colors.text },
  eventMeta: { fontSize: 11, color: colors.subtle, marginTop: 2 },
  eventDesc: { fontSize: 11, color: colors.subtle, marginTop: 2 },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  loadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 20 },
});
