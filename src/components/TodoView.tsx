import type { Task } from "../lib/types";
import TaskList from "./TaskList";
import AddTaskInput from "./AddTaskInput";

interface TodoViewProps {
  tasks: Task[];
  onAdd: (text: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export default function TodoView({
  tasks,
  onAdd,
  onToggle,
  onDelete,
  onReorder,
}: TodoViewProps) {
  return (
    <div className="todo-view">
      <TaskList
        tasks={tasks}
        onToggle={onToggle}
        onDelete={onDelete}
        onReorder={onReorder}
      />
      <AddTaskInput onAdd={onAdd} />
    </div>
  );
}
