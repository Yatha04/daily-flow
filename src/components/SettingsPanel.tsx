interface SettingsPanelProps {
  open: boolean;
  opacity: number;
  onOpacityChange: (v: number) => void;
  pinned: boolean;
  onPinnedChange: (v: boolean) => void;
}

export default function SettingsPanel({
  open,
  opacity,
  onOpacityChange,
  pinned,
  onPinnedChange,
}: SettingsPanelProps) {
  if (!open) return null;

  return (
    <div className="settings-panel">
      <label className="settings-label">
        Opacity
        <input
          type="range"
          min={0.2}
          max={0.9}
          step={0.05}
          value={opacity}
          onChange={(e) => onOpacityChange(Number(e.target.value))}
        />
      </label>
      <button
        className="settings-pin-btn"
        type="button"
        onClick={() => onPinnedChange(!pinned)}
      >
        {pinned ? "📌 Pinned" : "📍 Pin to top"}
      </button>
    </div>
  );
}
