import { useState, useCallback } from "react";
import { nanoid } from "nanoid";
import type { Task } from "../lib/types";
import TaskList from "./TaskList";
import AddTaskInput from "./AddTaskInput";

export default function TodoView() {
  const [tasks, setTasks] = useState<Task[]>([]);

  const addTask = useCallback((text: string) => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    setTasks((prev) => [
      ...prev,
      {
        id: nanoid(),
        text: trimmed,
        done: false,
        createdAt: Date.now(),
        order: prev.length,
      },
    ]);
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev
        .filter((t) => t.id !== id)
        .map((t, i) => ({ ...t, order: i })),
    );
  }, []);

  const reorderTask = useCallback((fromIndex: number, toIndex: number) => {
    setTasks((prev) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex < 0 ||
        toIndex > prev.length
      ) {
        return prev;
      }
      const next = prev.slice();
      const [moved] = next.splice(fromIndex, 1);
      const insertAt = toIndex > fromIndex ? toIndex - 1 : toIndex;
      next.splice(insertAt, 0, moved);
      return next.map((t, i) => ({ ...t, order: i }));
    });
  }, []);

  return (
    <div className="todo-view">
      <TaskList
        tasks={tasks}
        onToggle={toggleTask}
        onDelete={deleteTask}
        onReorder={reorderTask}
      />
      <AddTaskInput onAdd={addTask} />
    </div>
  );
}
