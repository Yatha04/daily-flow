import type { TabId } from "../lib/types";

interface TabBarProps {
  active: TabId;
  onChange: (next: TabId) => void;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "todos", label: "To-dos" },
  { id: "notes", label: "Notes" },
];

export default function TabBar({ active, onChange }: TabBarProps) {
  return (
    <div className="tab-bar">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={t.id === active ? "tab-active" : ""}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
