import { useState, useEffect, useRef, useCallback } from "react";

interface StopwatchState {
  startedAt: number | null;
  accumulatedMs: number;
  running: boolean;
}

const INITIAL: StopwatchState = {
  startedAt: null,
  accumulatedMs: 0,
  running: false,
};

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function Stopwatch() {
  const [sw, setSw] = useState<StopwatchState>(INITIAL);
  const [displayMs, setDisplayMs] = useState(0);
  const rafRef = useRef<number | null>(null);

  // rAF loop — runs only while running === true
  const tick = useCallback(() => {
    setSw((prev) => {
      if (!prev.running || prev.startedAt === null) return prev;
      const elapsed = Date.now() - prev.startedAt + prev.accumulatedMs;
      setDisplayMs(elapsed);
      return prev; // state unchanged; we only update displayMs
    });
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (sw.running) {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [sw.running, tick]);

  // Sync displayMs on pause / stop so the display freezes at the right value
  useEffect(() => {
    if (!sw.running) {
      setDisplayMs(sw.accumulatedMs);
    }
  }, [sw.running, sw.accumulatedMs]);

  const handleStart = useCallback(() => {
    setSw({ startedAt: Date.now(), accumulatedMs: 0, running: true });
  }, []);

  const handlePause = useCallback(() => {
    setSw((prev) => {
      if (!prev.running || prev.startedAt === null) return prev;
      return {
        startedAt: null,
        accumulatedMs: prev.accumulatedMs + (Date.now() - prev.startedAt),
        running: false,
      };
    });
  }, []);

  const handleResume = useCallback(() => {
    setSw((prev) => ({ ...prev, startedAt: Date.now(), running: true }));
  }, []);

  const handleStop = useCallback(() => {
    setSw(INITIAL);
  }, []);

  return (
    <div className="stopwatch">
      <span>{formatElapsed(displayMs)}</span>
      {!sw.running && sw.accumulatedMs === 0 && (
        <button className="stopwatch-btn" onClick={handleStart} title="Start">
          ▶
        </button>
      )}
      {sw.running && (
        <>
          <button className="stopwatch-btn" onClick={handlePause} title="Pause">
            ⏸
          </button>
          <button className="stopwatch-btn" onClick={handleStop} title="Stop">
            ⏹
          </button>
        </>
      )}
      {!sw.running && sw.accumulatedMs > 0 && (
        <>
          <button className="stopwatch-btn" onClick={handleResume} title="Resume">
            ▶
          </button>
          <button className="stopwatch-btn" onClick={handleStop} title="Stop">
            ⏹
          </button>
        </>
      )}
    </div>
  );
}
