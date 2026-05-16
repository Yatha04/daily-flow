import { useState, type KeyboardEvent } from "react";

interface AddTaskInputProps {
  onAdd: (text: string) => void;
}

export default function AddTaskInput({ onAdd }: AddTaskInputProps) {
  const [value, setValue] = useState("");

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (value.trim().length === 0) return;
      onAdd(value);
      setValue("");
    }
  }

  return (
    <div className="add-task">
      <span className="add-task-icon">+</span>
      <input
        className="add-task-input"
        type="text"
        placeholder="Add a task…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
