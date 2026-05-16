export default function NotesView() {
  return (
    <div className="notes-view">
      <textarea
        className="notes-textarea"
        defaultValue=""
        placeholder="Notes…"
        spellCheck={false}
      />
    </div>
  );
}
