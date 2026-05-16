import type { Task } from "../lib/types";
import TaskList from "./TaskList";
import AddTaskInput from "./AddTaskInput";

const SAMPLE_TASKS: Task[] = [
  { id: "1", text: "Buy groceries", done: false, createdAt: 1715900000000, order: 0 },
  { id: "2", text: "Review pull request", done: true, createdAt: 1715890000000, order: 1 },
  {
    id: "3",
    text: "Draft the quarterly report and send it to the team for review before Friday's deadline — include updated revenue charts",
    done: false,
    createdAt: 1715880000000,
    order: 2,
  },
  { id: "4", text: "Walk the dog", done: false, createdAt: 1715870000000, order: 3 },
  { id: "5", text: "Fix login page bug", done: true, createdAt: 1715860000000, order: 4 },
];

export default function TodoView() {
  return (
    <div className="todo-view">
      <TaskList tasks={SAMPLE_TASKS} />
      <AddTaskInput />
    </div>
  );
}
