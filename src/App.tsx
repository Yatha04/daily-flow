import { useEffect, useRef, useState } from "react";
import { getCurrentWindow, availableMonitors, primaryMonitor } from "@tauri-apps/api/window";
import { PhysicalPosition, PhysicalSize } from "@tauri-apps/api/dpi";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { loadWindowState, saveWindowState, loadSettings, saveSettings } from "./lib/api";
import type { TabId } from "./lib/types";
import TabBar from "./components/TabBar";
import Stopwatch from "./components/Stopwatch";
import TodoView from "./components/TodoView";
import NotesView from "./components/NotesView";
import "./styles.css";

function App() {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("todos");
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    const win = getCurrentWindow();
    let cancelled = false;
    const unlisteners: UnlistenFn[] = [];

    function scheduleDebounce() {
      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(async () => {
        debounceTimer.current = null;
        if (cancelled) return;
        try {
          const [pos, size] = await Promise.all([
            win.outerPosition(),
            win.outerSize(),
          ]);
          if (cancelled) return;
          await saveWindowState({
            x: pos.x,
            y: pos.y,
            width: size.width,
            height: size.height,
          });
        } catch (err) {
          console.error("saveWindowState failed:", err);
        }
      }, 300);
    }

    async function init() {
      const saved = await loadWindowState();
      if (cancelled) return;
      if (saved !== null) {
        const monitors = await availableMonitors();
        if (cancelled) return;

        const centerX = saved.x + saved.width / 2;
        const centerY = saved.y + saved.height / 2;

        const isVisible = monitors.some((m) => {
          const wa = m.workArea;
          return (
            centerX >= wa.position.x &&
            centerX < wa.position.x + wa.size.width &&
            centerY >= wa.position.y &&
            centerY < wa.position.y + wa.size.height
          );
        });

        let targetX = saved.x;
        let targetY = saved.y;

        if (!isVisible) {
          const primary = (await primaryMonitor()) ?? monitors[0] ?? null;
          if (cancelled) return;
          if (primary) {
            const wa = primary.workArea;
            targetX = wa.position.x + Math.floor((wa.size.width - saved.width) / 2);
            targetY = wa.position.y + Math.floor((wa.size.height - saved.height) / 2);
          }
        }

        await win.setSize(new PhysicalSize(saved.width, saved.height));
        if (cancelled) return;
        await win.setPosition(new PhysicalPosition(targetX, targetY));
        if (cancelled) return;
      }

      const u1 = await win.onMoved(scheduleDebounce);
      if (cancelled) { u1(); return; }
      unlisteners.push(u1);

      const u2 = await win.onResized(scheduleDebounce);
      if (cancelled) { u2(); return; }
      unlisteners.push(u2);
    }

    init().catch((err) => console.error("App init failed:", err));

    return () => {
      cancelled = true;
      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      for (const u of unlisteners) u();
      unlisteners.length = 0;
    };
  }, []);

  // Load settings on mount.
  useEffect(() => {
    let cancelled = false;
    loadSettings()
      .then((s) => {
        if (cancelled) return;
        if (s?.activeTab === "todos" || s?.activeTab === "notes") {
          setActiveTab(s.activeTab);
        }
      })
      .catch((e) => console.error("loadSettings failed:", e))
      .finally(() => {
        if (!cancelled) setSettingsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist activeTab (debounced) once initial load is done.
  useEffect(() => {
    if (!settingsLoaded) return;
    if (settingsDebounce.current !== null) clearTimeout(settingsDebounce.current);
    settingsDebounce.current = setTimeout(() => {
      settingsDebounce.current = null;
      saveSettings({ activeTab }).catch((e) =>
        console.error("saveSettings failed:", e),
      );
    }, 300);
    return () => {
      if (settingsDebounce.current !== null) {
        clearTimeout(settingsDebounce.current);
        settingsDebounce.current = null;
      }
    };
  }, [activeTab, settingsLoaded]);

  return (
    <div className="panel">
      <div className="drag-strip" data-tauri-drag-region />
      <div className="content">
        <div className="scrim" />
        <div className="content-inner">
          <div className="top-bar">
            <TabBar active={activeTab} onChange={setActiveTab} />
            <Stopwatch />
          </div>
          <div className="view-slot">
            {activeTab === "todos" ? <TodoView /> : <NotesView />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
