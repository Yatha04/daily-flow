import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWindow, availableMonitors, primaryMonitor } from "@tauri-apps/api/window";
import { PhysicalPosition, PhysicalSize } from "@tauri-apps/api/dpi";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { nanoid } from "nanoid";
import {
  loadWindowState,
  saveWindowState,
  loadSettings,
  saveSettings,
  loadTasks,
  saveTasks,
  rolloverTasks,
  setPinMode,
  getAutostart,
  enableAutostart,
  disableAutostart,
} from "./lib/api";
import type { TabId, Task } from "./lib/types";
import TabBar from "./components/TabBar";
import Stopwatch from "./components/Stopwatch";
import SettingsPanel from "./components/SettingsPanel";
import TodoView from "./components/TodoView";
import ThoughtsView from "./components/ThoughtsView";
import "./styles.css";

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function App() {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tasksDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("todos");
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [opacity, setOpacity] = useState<number>(0.55);
  const [pinned, setPinned] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autostart, setAutostart] = useState<boolean>(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);

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
        if (s?.activeTab === "todos" || s?.activeTab === "thoughts") {
          setActiveTab(s.activeTab);
        }
        if (typeof s?.opacity === "number") setOpacity(s.opacity);
        if (typeof s?.pinned === "boolean") setPinned(s.pinned);
        const restoredPinned = typeof s?.pinned === "boolean" ? s.pinned : false;
        setPinMode(restoredPinned).catch((e) =>
          console.error("setPinMode (restore) failed:", e),
        );
        getAutostart()
          .then((v) => { if (!cancelled) setAutostart(v); })
          .catch((e) => console.error("getAutostart failed:", e));
      })
      .catch((e) => console.error("loadSettings failed:", e))
      .finally(() => {
        if (!cancelled) setSettingsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist settings (debounced) once initial load is done.
  useEffect(() => {
    if (!settingsLoaded) return;
    if (settingsDebounce.current !== null) clearTimeout(settingsDebounce.current);
    settingsDebounce.current = setTimeout(() => {
      settingsDebounce.current = null;
      saveSettings({ activeTab, opacity, pinned }).catch((e) =>
        console.error("saveSettings failed:", e),
      );
    }, 300);
    return () => {
      if (settingsDebounce.current !== null) {
        clearTimeout(settingsDebounce.current);
        settingsDebounce.current = null;
      }
    };
  }, [activeTab, opacity, pinned, settingsLoaded]);

  // Sync pin state to Rust whenever it changes after load.
  useEffect(() => {
    if (!settingsLoaded) return;
    setPinMode(pinned).catch((e) => console.error("setPinMode failed:", e));
  }, [pinned, settingsLoaded]);

  // Sync autostart to Rust whenever it changes after load.
  useEffect(() => {
    if (!settingsLoaded) return;
    if (autostart) {
      enableAutostart().catch((e) => console.error("enableAutostart failed:", e));
    } else {
      disableAutostart().catch((e) => console.error("disableAutostart failed:", e));
    }
  }, [autostart, settingsLoaded]);

  // Rollover + load tasks on mount and on window focus.
  useEffect(() => {
    const win = getCurrentWindow();
    let cancelled = false;
    let unlistenFocus: UnlistenFn | null = null;

    async function refresh() {
      try {
        const result = await rolloverTasks(todayLocal());
        if (cancelled) return;
        setTasks(result.remaining);
      } catch (e) {
        console.error("rolloverTasks failed:", e);
        try {
          const t = await loadTasks();
          if (cancelled) return;
          setTasks(t);
        } catch (e2) {
          console.error("loadTasks fallback failed:", e2);
        }
      } finally {
        if (!cancelled) setTasksLoaded(true);
      }
    }

    refresh();

    win
      .onFocusChanged(({ payload: focused }) => {
        if (focused) refresh();
      })
      .then((u) => {
        if (cancelled) u();
        else unlistenFocus = u;
      })
      .catch((e) => console.error("onFocusChanged failed:", e));

    return () => {
      cancelled = true;
      if (unlistenFocus) unlistenFocus();
    };
  }, []);

  // Debounced save of tasks after first load.
  useEffect(() => {
    if (!tasksLoaded) return;
    if (tasksDebounce.current !== null) clearTimeout(tasksDebounce.current);
    tasksDebounce.current = setTimeout(() => {
      tasksDebounce.current = null;
      saveTasks(tasks).catch((e) => console.error("saveTasks failed:", e));
    }, 300);
    return () => {
      if (tasksDebounce.current !== null) {
        clearTimeout(tasksDebounce.current);
        tasksDebounce.current = null;
      }
    };
  }, [tasks, tasksLoaded]);

  const addTask = useCallback((text: string) => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    setTasks((prev) => [
      ...prev,
      {
        id: nanoid(),
        text: trimmed,
        done: false,
        createdAt: Date.now(),
        order: prev.length,
      },
    ]);
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev
        .filter((t) => t.id !== id)
        .map((t, i) => ({ ...t, order: i })),
    );
  }, []);

  const reorderTask = useCallback((fromIndex: number, toIndex: number) => {
    setTasks((prev) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex < 0 ||
        toIndex > prev.length
      ) {
        return prev;
      }
      const next = prev.slice();
      const [moved] = next.splice(fromIndex, 1);
      const insertAt = toIndex > fromIndex ? toIndex - 1 : toIndex;
      next.splice(insertAt, 0, moved);
      return next.map((t, i) => ({ ...t, order: i }));
    });
  }, []);

  return (
    <div
      className="panel"
      style={{ "--panel-opacity": opacity } as React.CSSProperties}
    >
      <div className="drag-strip" data-tauri-drag-region />
      <div className="content">
        <div className="scrim" />
        <div className="content-inner">
          <div className="top-bar">
            <Stopwatch />
            <TabBar active={activeTab} onChange={setActiveTab} />
            <button
              type="button"
              className="settings-gear-btn"
              onClick={() => setSettingsOpen((o) => !o)}
              aria-label="Toggle settings"
            >
              ⚙
            </button>
          </div>
          <SettingsPanel
            open={settingsOpen}
            opacity={opacity}
            onOpacityChange={setOpacity}
            pinned={pinned}
            onPinnedChange={setPinned}
            autostart={autostart}
            onAutostartChange={setAutostart}
          />
          <div className="view-slot">
            {activeTab === "todos" ? (
              <TodoView
                tasks={tasks}
                onAdd={addTask}
                onToggle={toggleTask}
                onDelete={deleteTask}
                onReorder={reorderTask}
              />
            ) : (
              <ThoughtsView />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
