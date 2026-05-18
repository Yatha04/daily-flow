import { useEffect, useRef, useState } from "react";
import { loadNotes, saveNotes } from "../lib/api";

export default function NotesView() {
  const [content, setContent] = useState("");
  const [loaded, setLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadNotes().then((text) => {
      if (!cancelled) {
        setContent(text);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    setContent(next);
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveNotes(next);
    }, 300);
  }

  return (
    <div className="notes-view">
      <textarea
        className="notes-textarea"
        value={loaded ? content : ""}
        disabled={!loaded}
        placeholder="Notes…"
        spellCheck={false}
        onChange={handleChange}
      />
    </div>
  );
}
