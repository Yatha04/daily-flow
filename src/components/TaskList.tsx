import { useEffect, useRef, useState } from "react";
import type { Task } from "../lib/types";
import TaskRow from "./TaskRow";

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

interface DropTarget {
  index: number;
  position: "above" | "below";
}

export default function TaskList({
  tasks,
  onToggle,
  onDelete,
  onReorder,
}: TaskListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  // Refs mirror state so window-level handlers stay synchronous.
  const dragIndexRef = useRef<number | null>(null);
  const dropTargetRef = useRef<DropTarget | null>(null);
  dragIndexRef.current = dragIndex;
  dropTargetRef.current = dropTarget;

  function startDrag(index: number) {
    setDragIndex(index);
    setDropTarget({ index, position: "above" });
  }

  useEffect(() => {
    if (dragIndex === null) return;

    function rowAt(y: number): DropTarget | null {
      const list = listRef.current;
      if (!list) return null;
      const rows = list.querySelectorAll<HTMLDivElement>(".task-row");
      for (let i = 0; i < rows.length; i++) {
        const rect = rows[i].getBoundingClientRect();
        if (y < rect.top) {
          return { index: i, position: "above" };
        }
        if (y <= rect.bottom) {
          const mid = rect.top + rect.height / 2;
          return { index: i, position: y < mid ? "above" : "below" };
        }
      }
      if (rows.length > 0) {
        return { index: rows.length - 1, position: "below" };
      }
      return null;
    }

    function onMove(e: PointerEvent) {
      const t = rowAt(e.clientY);
      if (!t) return;
      const prev = dropTargetRef.current;
      if (!prev || prev.index !== t.index || prev.position !== t.position) {
        setDropTarget(t);
      }
    }

    function finish() {
      const from = dragIndexRef.current;
      const tgt = dropTargetRef.current;
      if (from !== null && tgt !== null) {
        const toIndex = tgt.position === "above" ? tgt.index : tgt.index + 1;
        onReorder(from, toIndex);
      }
      setDragIndex(null);
      setDropTarget(null);
    }

    function onUp() {
      finish();
    }

    function onCancel() {
      setDragIndex(null);
      setDropTarget(null);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, [dragIndex, onReorder]);

  return (
    <div ref={listRef} className="task-list">
      {tasks.map((task, i) => (
        <TaskRow
          key={task.id}
          task={task}
          index={i}
          onToggle={onToggle}
          onDelete={onDelete}
          onHandlePointerDown={() => startDrag(i)}
          dropIndicator={
            dropTarget && dropTarget.index === i ? dropTarget.position : null
          }
          dragging={dragIndex === i}
        />
      ))}
    </div>
  );
}
