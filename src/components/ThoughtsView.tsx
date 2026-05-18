import { useEffect, useRef, useState } from "react";
import { loadNotes, saveNotes } from "../lib/api";

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// File format:
//   DATEKEY\n{body}\n---\nDATEKEY\n{body}\n---\n...
// DATEKEY is YYYY-MM-DD, body is freeform text.

function parseFile(raw: string): { todayBody: string; archive: string } {
  const key = todayKey();
  if (raw.startsWith(key + "\n")) {
    const rest = raw.slice(key.length + 1);
    const sep = rest.indexOf("\n---\n");
    if (sep === -1) return { todayBody: rest, archive: "" };
    return { todayBody: rest.slice(0, sep), archive: rest.slice(sep + 5) };
  }
  return { todayBody: "", archive: raw };
}

function buildFile(todayBody: string, archive: string): string {
  const key = todayKey();
  const body = todayBody.trimEnd();
  if (!archive) return `${key}\n${body}`;
  return `${key}\n${body}\n---\n${archive}`;
}

export default function ThoughtsView() {
  const [body, setBody] = useState("");
  const [loaded, setLoaded] = useState(false);
  const archiveRef = useRef("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadNotes()
      .then((raw) => {
        if (cancelled) return;
        const { todayBody, archive } = parseFile(raw);
        archiveRef.current = archive;
        setBody(todayBody);
        setLoaded(true);
        requestAnimationFrame(() => {
          if (cancelled || !textareaRef.current) return;
          const ta = textareaRef.current;
          ta.focus();
          ta.setSelectionRange(ta.value.length, ta.value.length);
          ta.scrollTop = 0;
        });
      })
      .catch((e) => {
        console.error("loadNotes failed:", e);
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    setBody(next);
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveNotes(buildFile(next, archiveRef.current)).catch((err) =>
        console.error("saveNotes failed:", err),
      );
    }, 300);
  }

  return (
    <div className="thoughts-view">
      <div className="thoughts-date">{formatDate(new Date())}</div>
      <textarea
        ref={textareaRef}
        className="thoughts-textarea"
        value={loaded ? body : ""}
        disabled={!loaded}
        placeholder="Write something…"
        spellCheck
        onChange={handleChange}
      />
    </div>
  );
}
