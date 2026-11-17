import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { format } from "date-fns";
import { api, errorMessage } from "../api/client";
import { AppEvent } from "../types";
import { colors, radii, shadow } from "../theme";
import { Button, ErrorBanner, Input, Label, Text } from "../ui";

export default function EventModal({
  visible,
  date,
  event,
  onClose,
  onSaved,
  onDeleted,
}: {
  visible: boolean;
  date: Date;
  event?: AppEvent | null;
  onClose: () => void;
  onSaved: (event: AppEvent, created: boolean) => void;
  onDeleted?: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState(format(date, "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (event) {
      const start = new Date(event.startTime);
      setTitle(event.title);
      setDescription(event.description || "");
      setEventDate(format(start, "yyyy-MM-dd"));
      setStartTime(format(start, "HH:mm"));
      setEndTime(event.endTime ? format(new Date(event.endTime), "HH:mm") : "");
      setAllDay(event.allDay);
    } else {
      setTitle("");
      setDescription("");
      setEventDate(format(date, "yyyy-MM-dd"));
      setStartTime("09:00");
      setEndTime("10:00");
      setAllDay(false);
    }
    setError(null);
    setBusy(false);
  }, [visible, event, date]);

  const save = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    const startISO = allDay
      ? new Date(`${eventDate}T00:00:00`).toISOString()
      : new Date(`${eventDate}T${startTime || "00:00"}:00`).toISOString();
    const endISO = allDay
      ? new Date(`${eventDate}T23:59:59`).toISOString()
      : endTime
        ? new Date(`${eventDate}T${endTime}:00`).toISOString()
        : new Date(new Date(`${eventDate}T${startTime || "00:00"}:00`).getTime() + 3600000).toISOString();

    const payload = {
      title: title.trim(),
      description: description.trim(),
      startTime: startISO,
      endTime: endISO,
      allDay,
    };
    try {
      const saved = event
        ? await api.patch<AppEvent>(`/events/${event.id}`, payload)
        : await api.post<AppEvent>("/events", payload);
      onSaved(saved, !event);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (!event) return;
    Alert.alert("Delete event?", event.title, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.del(`/events/${event.id}`);
            onDeleted?.(event.id);
            onClose();
          } catch (e) {
            setError(errorMessage(e));
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          <View style={s.handle} />
          <View style={s.head}>
            <View>
              <Text weight="black" style={s.title}>
                {event ? "Edit Event" : "New Event"}
              </Text>
              <Text style={s.sub}>Plan it, then let Bloom track it.</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={s.close}>
              <Feather name="x" size={20} color={colors.slate500} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16 }}>
            {error ? <ErrorBanner message={error} /> : null}

            <View>
              <Label>Event title</Label>
              <Input value={title} onChangeText={setTitle} placeholder="e.g. Team planning" autoFocus={!event} />
            </View>

            <View>
              <Label>Description</Label>
              <Input
                value={description}
                onChangeText={setDescription}
                placeholder="Optional notes..."
                multiline
                style={{ minHeight: 72, textAlignVertical: "top" }}
              />
            </View>

            <View>
              <Label>Date</Label>
              <Input value={eventDate} onChangeText={setEventDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
            </View>

            <View style={s.switchRow}>
              <View>
                <Text weight="semibold" style={{ color: colors.text }}>All day</Text>
                <Text style={{ fontSize: 12, color: colors.subtle }}>Block the whole day.</Text>
              </View>
              <Switch
                value={allDay}
                onValueChange={setAllDay}
                trackColor={{ true: colors.green, false: colors.slate200 }}
                thumbColor={colors.white}
              />
            </View>

            {!allDay ? (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Label>Start</Label>
                  <Input value={startTime} onChangeText={setStartTime} placeholder="09:00" />
                </View>
                <View style={{ flex: 1 }}>
                  <Label>End</Label>
                  <Input value={endTime} onChangeText={setEndTime} placeholder="10:00" />
                </View>
              </View>
            ) : null}

            <View style={s.footer}>
              {event ? (
                <Button
                  label="Delete"
                  variant="danger"
                  onPress={remove}
                  icon={<Feather name="trash-2" size={16} color={colors.danger} />}
                />
              ) : (
                <View />
              )}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Button label="Cancel" variant="ghost" onPress={onClose} />
                <Button label={event ? "Save" : "Create"} onPress={save} busy={busy} disabled={!title.trim()} />
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: "92%",
    ...shadow,
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.slate200,
    marginBottom: 14,
  },
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  title: { fontSize: 24, color: colors.text, letterSpacing: -0.5 },
  sub: { fontSize: 13, color: colors.subtle, marginTop: 2 },
  close: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
    gap: 10,
  },
});
