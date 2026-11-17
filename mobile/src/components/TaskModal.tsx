import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { format } from "date-fns";
import { api, errorMessage } from "../api/client";
import { Priority, Status, Task } from "../types";
import { colors, priority as priorityColors, radii, shadow } from "../theme";
import { Button, Chip, ErrorBanner, Input, Label, Text } from "../ui";

const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const STATUSES: { value: Status; label: string }[] = [
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "DONE", label: "Done" },
];

export default function TaskModal({
  visible,
  onClose,
  task,
  defaultStatus = "TODO",
  onSaved,
  onDeleted,
}: {
  visible: boolean;
  onClose: () => void;
  task?: Task | null;
  defaultStatus?: Status;
  onSaved: (task: Task, created: boolean) => void;
  onDeleted?: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>("TODO");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTitle(task?.title || "");
    setDescription(task?.description || "");
    setStatus(task?.status || defaultStatus);
    setPriority(task?.priority || "MEDIUM");
    setDueDate(task?.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "");
    setError(null);
    setBusy(false);
  }, [visible, task, defaultStatus]);

  const save = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      dueDate: dueDate.trim() || undefined,
    };
    try {
      const saved = task
        ? await api.put<Task>(`/tasks/${task.id}`, payload)
        : await api.post<Task>("/tasks", payload);
      onSaved(saved, !task);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (!task) return;
    Alert.alert("Delete task?", task.title, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.del(`/tasks/${task.id}`);
            onDeleted?.(task.id);
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
      <KeyboardAvoidingView
        style={s.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={s.backdrop} onPress={onClose} />
        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          <View style={s.handle} />
          <View style={s.head}>
            <View>
              <Text weight="black" style={s.title}>
                {task ? "Edit Task" : "New Task"}
              </Text>
              <Text style={s.sub}>{task ? "Update the details below." : "What needs to bloom?"}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={s.close}>
              <Feather name="x" size={20} color={colors.slate500} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16 }}>
            {error ? <ErrorBanner message={error} /> : null}

            <View>
              <Label>Task title</Label>
              <Input
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Design the landing page"
                autoFocus={!task}
                returnKeyType="next"
              />
            </View>

            <View>
              <Label>Description</Label>
              <Input
                value={description}
                onChangeText={setDescription}
                placeholder="Add a little context..."
                multiline
                style={{ minHeight: 82, textAlignVertical: "top" }}
              />
            </View>

            <View>
              <Label>Priority</Label>
              <View style={s.chipRow}>
                {PRIORITIES.map((p) => (
                  <Chip
                    key={p}
                    label={p[0] + p.slice(1).toLowerCase()}
                    selected={priority === p}
                    onPress={() => setPriority(p)}
                    activeColor={priorityColors[p].color}
                  />
                ))}
              </View>
            </View>

            <View>
              <Label>Status</Label>
              <View style={s.chipRow}>
                {STATUSES.map((st) => (
                  <Chip
                    key={st.value}
                    label={st.label}
                    selected={status === st.value}
                    onPress={() => setStatus(st.value)}
                  />
                ))}
              </View>
            </View>

            <View>
              <Label>Due date</Label>
              <Input
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
              />
            </View>

            <View style={s.footer}>
              {task ? (
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
                <Button label={task ? "Save" : "Create"} onPress={save} busy={busy} disabled={!title.trim()} />
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
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
