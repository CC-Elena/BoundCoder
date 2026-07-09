import { useCallback, useEffect, useRef } from "react";
import type { AgentEvent } from "@boundcoder/shared";
import { createDemoRun } from "../../features/agentTimeline/demo";
import { DEFAULT_AGENT_TASK, useAgentTimelineStore } from "../../features/agentTimeline/store";
import { AppHeader } from "../../app/components/AppHeader";
import { SidebarPanel } from "../../app/components/SidebarPanel";
import { ContentPanel } from "../../app/components/ContentPanel";
import { InspectorPanel } from "../../app/components/InspectorPanel";
import { ds } from "../../app/design-system";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

const REPLAY_DELAY_MS = 180;

export function AgentTimelinePage() {
  const task = useAgentTimelineStore((state) => state.task);
  const status = useAgentTimelineStore((state) => state.status);
  const finalAnswer = useAgentTimelineStore((state) => state.finalAnswer);
  const isRunning = useAgentTimelineStore((state) => state.isRunning);
  const replayedEvents = useAgentTimelineStore((state) => state.replayedEvents);
  const selectedEventIndex = useAgentTimelineStore((state) => state.selectedEventIndex);
  const setTask = useAgentTimelineStore((state) => state.setTask);
  const beginRun = useAgentTimelineStore((state) => state.beginRun);
  const setFullEvents = useAgentTimelineStore((state) => state.setFullEvents);
  const setReplayedEvents = useAgentTimelineStore((state) => state.setReplayedEvents);
  const setSelectedEventIndex = useAgentTimelineStore((state) => state.setSelectedEventIndex);
  const finishRun = useAgentTimelineStore((state) => state.finishRun);
  const reset = useAgentTimelineStore((state) => state.reset);
  const playbackTimersRef = useRef<number[]>([]);

  const clearPlaybackTimers = useCallback(() => {
    for (const timerId of playbackTimersRef.current) {
      window.clearTimeout(timerId);
    }
    playbackTimersRef.current = [];
  }, []);

  useEffect(() => clearPlaybackTimers, [clearPlaybackTimers]);

  const schedulePlayback = useCallback((delayMs: number, callback: () => void) => {
    const timerId = window.setTimeout(callback, delayMs);
    playbackTimersRef.current.push(timerId);
  }, []);

  const runDemo = useCallback(async () => {
    if (useAgentTimelineStore.getState().isRunning) {
      return;
    }

    clearPlaybackTimers();
    beginRun();

    const collectedEvents: AgentEvent[] = [];
    const replayedEventsBuffer: AgentEvent[] = [];

    const result = await createDemoRun(task.trim(), (event) => {
      collectedEvents.push(event);
      const playbackIndex = collectedEvents.length - 1;

      schedulePlayback(playbackIndex * REPLAY_DELAY_MS, () => {
        replayedEventsBuffer.push(event);
        setFullEvents([...collectedEvents]);
        setReplayedEvents([...replayedEventsBuffer]);
        setSelectedEventIndex(replayedEventsBuffer.length - 1);
      });
    });

    schedulePlayback(collectedEvents.length * REPLAY_DELAY_MS, () => {
      finishRun(`Stopped: ${result.stopReason}`, result.finalAnswer ?? "(none)");
    });
  }, [beginRun, clearPlaybackTimers, finishRun, schedulePlayback, setFullEvents, setReplayedEvents, setSelectedEventIndex, task]);

  const resetDemo = useCallback(() => {
    if (useAgentTimelineStore.getState().isRunning) {
      return;
    }

    clearPlaybackTimers();
    reset();
    setTask(DEFAULT_AGENT_TASK);
    setSelectedEventIndex(null);
  }, [clearPlaybackTimers, reset, setSelectedEventIndex, setTask]);

  return (
    <main className={ds.appShell}>
      <section className={ds.topBanner}>
        <AppHeader
          status={status}
          finalAnswer={finalAnswer}
          eventCount={replayedEvents.length}
        />
        <div>
          <h1 className={ds.title}>Event Protocol + Timeline Replay</h1>
          <p className={ds.subtitle}>
            这是一个最小事件协议演示：<code>runAgentLoop</code> 在执行时会产生事件，
            前端把这些事件回放成一条时间线，方便你学习 agent 的运行轨迹和界面表达。
          </p>
        </div>
      </section>

      <section className={ds.productGrid}>
        <SidebarPanel
          task={task}
          isRunning={isRunning}
          status={status}
          finalAnswer={finalAnswer}
          onTaskChange={setTask}
          onRun={() => {
            void runDemo();
          }}
          onReset={resetDemo}
        />

        <ContentPanel
          events={replayedEvents}
          selectedEventIndex={selectedEventIndex}
          onSelectEventIndex={setSelectedEventIndex}
        />

        <InspectorPanel
          events={replayedEvents}
          selectedEventIndex={selectedEventIndex}
          onSelectEventIndex={setSelectedEventIndex}
        />
      </section>
    </main>
  );
}