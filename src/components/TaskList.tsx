import type { Task } from "../lib/types";
import TaskRow from "./TaskRow";

interface TaskListProps {
  tasks: Task[];
}

export default function TaskList({ tasks }: TaskListProps) {
  return (
    <div className="task-list">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </div>
  );
}
