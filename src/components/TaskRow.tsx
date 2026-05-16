import type { PointerEvent } from "react";
import type { Task } from "../lib/types";

interface TaskRowProps {
  task: Task;
  index: number;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onHandlePointerDown: (e: PointerEvent<HTMLSpanElement>) => void;
  dropIndicator: "above" | "below" | null;
  dragging: boolean;
}

export default function TaskRow({
  task,
  onToggle,
  onDelete,
  onHandlePointerDown,
  dropIndicator,
  dragging,
}: TaskRowProps) {
  const classes = [
    "task-row",
    task.done ? "task-done" : "",
    dragging ? "task-dragging" : "",
    dropIndicator === "above" ? "drop-above" : "",
    dropIndicator === "below" ? "drop-below" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <span
        className="task-handle"
        aria-label="Drag to reorder"
        title="Drag to reorder"
        onPointerDown={(e) => {
          // Only primary button. Don't preventDefault here — we still want
          // the OS to deliver subsequent pointermove/up events to window.
          if (e.button !== 0) return;
          onHandlePointerDown(e);
        }}
      >
        ⋮⋮
      </span>
      <span
        className="task-checkbox"
        aria-checked={task.done}
        role="checkbox"
        tabIndex={0}
        onClick={() => onToggle(task.id)}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            onToggle(task.id);
          }
        }}
      >
        {task.done && (
          <svg viewBox="0 0 14 14" width="14" height="14" fill="none">
            <path
              d="M2.5 7.5L5.5 10.5L11.5 3.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="task-text">{task.text}</span>
      <button
        className="task-delete"
        aria-label="Delete task"
        tabIndex={-1}
        onClick={() => onDelete(task.id)}
      >
        ×
      </button>
    </div>
  );
}
