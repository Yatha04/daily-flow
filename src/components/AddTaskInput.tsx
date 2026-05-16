export default function AddTaskInput() {
  return (
    <div className="add-task">
      <span className="add-task-icon">+</span>
      <input
        className="add-task-input"
        type="text"
        placeholder="Add a task…"
        readOnly
      />
    </div>
  );
}
