import React, { useCallback, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { errorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useOnDataSynced } from "../offline/SyncContext";
import { getCachedHabits } from "../offline/localDb";
import {
  createHabitOfflineFirst,
  deleteHabitOfflineFirst,
  fetchHabitsOfflineFirst,
  logHabitOfflineFirst,
} from "../offline/offlineApi";
import { Habit } from "../types";
import { colors, radii, shadow } from "../theme";
import { loggedToday } from "../utils";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorBanner,
  Input,
  Screen,
  SectionHeader,
  Text,
} from "../ui";

export default function HabitsScreen() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState<Habit["frequency"]>("DAILY");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      const cached = await getCachedHabits(user.id);
      if (cached.length > 0) {
        setHabits(cached);
        setLoading(false);
      }
      const res = await fetchHabitsOfflineFirst(user.id);
      setHabits(res.items);
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
    setHabits(await getCachedHabits(user.id));
  }, [user]);

  useOnDataSynced(reloadFromCache);

  const add = async () => {
    if (!title.trim() || !user) return;
    setAdding(true);
    try {
      const { habit } = await createHabitOfflineFirst(user.id, {
        title: title.trim(),
        frequency,
      });
      setHabits((prev) => [habit, ...prev]);
      setTitle("");
      setShowAdd(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setAdding(false);
    }
  };

  const log = async (habit: Habit) => {
    if (!user) return;
    try {
      const { entry } = await logHabitOfflineFirst(user.id, habit);
      setHabits((prev) =>
        prev.map((h) => (h.id === habit.id ? { ...h, logs: [...(h.logs ?? []), entry] } : h))
      );
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const remove = (habit: Habit) => {
    if (!user) return;
    Alert.alert("Delete habit?", habit.title, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setHabits((prev) => prev.filter((h) => h.id !== habit.id));
          try {
            await deleteHabitOfflineFirst(user.id, habit.id);
          } catch (e) {
            setError(errorMessage(e));
            load();
          }
        },
      },
    ]);
  };

  const doneCount = habits.filter(loggedToday).length;
  const rate = habits.length ? Math.round((doneCount / habits.length) * 100) : 0;

  return (
    <Screen
      title="Habits"
      subtitle={habits.length ? `${doneCount} of ${habits.length} done today` : "Build your daily rhythm."}
      right={
        <Button
          label="New Habit"
          small
          onPress={() => setShowAdd((v) => !v)}
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

        <View style={s.heroPurple}>
          <MaterialCommunityIcons name="target" size={26} color={colors.white} />
          <Text weight="black" style={s.heroValue}>
            {rate}%
          </Text>
          <Text weight="black" style={s.heroLabelLight}>
            HABITS COMPLETED TODAY
          </Text>
          <Text weight="black" style={s.heroGhost}>
            %
          </Text>
        </View>

        <View style={s.heroGreen}>
          <MaterialCommunityIcons name="trophy-outline" size={26} color={colors.darkGreen} />
          <Text weight="black" style={[s.heroValue, { color: colors.darkGreen }]}>
            {habits.length}
          </Text>
          <Text weight="black" style={s.heroLabelDark}>
            ACTIVE HABITS
          </Text>
          <Feather name="activity" size={64} color={colors.darkGreen} style={s.heroGhostIcon} />
        </View>

        <SectionHeader title="Your habits" subtitle="Small wins lead to big changes." />

        {showAdd ? (
          <Card style={s.addCard}>
            <View>
              <Text weight="black" style={s.addKicker}>
                THE GOAL
              </Text>
              <Input
                value={title}
                onChangeText={setTitle}
                placeholder="Waking up at 6am..."
                autoFocus
                returnKeyType="done"
                onSubmitEditing={add}
                style={s.addInput}
              />
            </View>
            <View>
              <Text weight="black" style={s.addKicker}>
                FREQUENCY
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <Chip label="Daily" selected={frequency === "DAILY"} onPress={() => setFrequency("DAILY")} />
                <Chip label="Weekly" selected={frequency === "WEEKLY"} onPress={() => setFrequency("WEEKLY")} />
              </View>
            </View>
            <View style={s.addFooter}>
              <Button label="Later" variant="ghost" onPress={() => setShowAdd(false)} />
              <Button label="Start habit" onPress={add} busy={adding} disabled={!title.trim()} />
            </View>
          </Card>
        ) : null}

        {loading ? (
          <View style={s.loadingWrap}>
            <MaterialCommunityIcons name="flower" size={30} color={colors.green} />
            <Text style={{ color: colors.muted, marginTop: 8 }}>Loading habits...</Text>
          </View>
        ) : habits.length === 0 ? (
          <EmptyState
            icon={<MaterialCommunityIcons name="target" size={30} color={colors.primary} />}
            title="No habits yet"
            message="Build your first daily habit to gain structure and routine."
            actionLabel="Create First Habit"
            onAction={() => setShowAdd(true)}
          />
        ) : (
          habits.map((habit) => {
            const done = loggedToday(habit);
            return (
              <Card key={habit.id} style={[s.habitCard, done && { borderColor: colors.greenSoft }]}>
                <View style={s.habitHead}>
                  <View style={[s.habitIcon, done && { backgroundColor: colors.green }]}>
                    <MaterialCommunityIcons
                      name="target"
                      size={24}
                      color={done ? colors.white : colors.primary}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => remove(habit)}
                    hitSlop={10}
                    accessibilityLabel={`Delete habit ${habit.title}`}
                  >
                    <Feather name="trash-2" size={17} color={colors.slate400} />
                  </TouchableOpacity>
                </View>

                <Text
                  weight="black"
                  style={[s.habitTitle, done && { color: colors.subtle, textDecorationLine: "line-through" }]}
                >
                  {habit.title}
                </Text>

                <View style={s.freqChip}>
                  <Feather name="calendar" size={11} color={colors.slate600} />
                  <Text weight="black" style={s.freqText}>
                    {habit.frequency}
                  </Text>
                </View>

                <View style={s.habitFooter}>
                  <View>
                    <Text weight="black" style={s.habitFootKicker}>
                      HABIT
                    </Text>
                    <Text weight="bold" style={s.habitFootValue}>
                      Scheduled
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => !done && log(habit)}
                    disabled={done}
                    style={[s.doneBtn, done ? s.doneBtnDone : { backgroundColor: colors.primary }]}
                  >
                    <Text weight="black" style={[s.doneBtnText, done && { color: colors.darkGreen }]}>
                      {done ? "Completed!" : "Done Today"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 30, gap: 16 },
  heroPurple: {
    backgroundColor: colors.purple,
    borderRadius: 24,
    padding: 22,
    overflow: "hidden",
    ...shadow,
  },
  heroGreen: {
    backgroundColor: colors.green,
    borderRadius: 24,
    padding: 22,
    overflow: "hidden",
    ...shadow,
  },
  heroValue: { color: colors.white, fontSize: 38, letterSpacing: -1, marginTop: 10 },
  heroLabelLight: { color: colors.white, opacity: 0.7, fontSize: 10, letterSpacing: 1.4, marginTop: 2 },
  heroLabelDark: { color: colors.darkGreen, opacity: 0.7, fontSize: 10, letterSpacing: 1.4, marginTop: 2 },
  heroGhost: {
    position: "absolute",
    right: -2,
    bottom: -28,
    fontSize: 130,
    color: colors.white,
    opacity: 0.1,
  },
  heroGhostIcon: { position: "absolute", right: -8, bottom: -14, opacity: 0.1 },
  addCard: { gap: 16, borderWidth: 2, borderColor: colors.slate100 },
  addKicker: { fontSize: 10, color: colors.primary, letterSpacing: 2, marginBottom: 4 },
  addInput: {
    backgroundColor: "transparent",
    borderWidth: 0,
    borderBottomWidth: 2,
    borderBottomColor: colors.slate100,
    borderRadius: 0,
    paddingHorizontal: 0,
    fontSize: 20,
    fontFamily: "Outfit_700Bold",
  },
  addFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
    paddingTop: 14,
  },
  loadingWrap: { alignItems: "center", paddingVertical: 40 },
  habitCard: { gap: 13 },
  habitHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  habitIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  habitTitle: { fontSize: 20, color: colors.text, letterSpacing: -0.3 },
  freqChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.slate100,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  freqText: { fontSize: 9, color: colors.slate600, letterSpacing: 1 },
  habitFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
    paddingTop: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  habitFootKicker: { fontSize: 9, color: colors.slate500, letterSpacing: 1 },
  habitFootValue: { fontSize: 13, color: colors.slate700, marginTop: 1 },
  doneBtn: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: radii.lg },
  doneBtnDone: { backgroundColor: colors.greenLight },
  doneBtnText: { color: colors.white, fontSize: 13 },
});
