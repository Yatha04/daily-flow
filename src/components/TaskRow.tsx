import type { Task } from "../lib/types";

interface TaskRowProps {
  task: Task;
}

export default function TaskRow({ task }: TaskRowProps) {
  return (
    <div className={`task-row ${task.done ? "task-done" : ""}`}>
      <span className="task-checkbox" aria-checked={task.done} role="checkbox" tabIndex={0}>
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
      <button className="task-delete" aria-label="Delete task" tabIndex={-1}>
        ×
      </button>
    </div>
  );
}
