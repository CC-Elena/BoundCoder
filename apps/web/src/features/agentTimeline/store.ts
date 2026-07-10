import { create } from "zustand";
import type { AgentEvent } from "@boundcoder/shared";
import type { PendingWebApproval } from "./web-approval";

export const DEFAULT_AGENT_TASK = "search: createCounter";

export interface AgentTimelineState {
  task: string;
  status: string;
  finalAnswer: string;
  isRunning: boolean;
  pendingApproval: PendingWebApproval | null;
  fullEvents: AgentEvent[];
  replayedEvents: AgentEvent[];
  selectedEventIndex: number | null;
  setTask: (task: string) => void;
  beginRun: () => void;
  setStatus: (status: string) => void;
  setFinalAnswer: (finalAnswer: string) => void;
  setFullEvents: (events: AgentEvent[]) => void;
  setReplayedEvents: (events: AgentEvent[]) => void;
  setPendingApproval: (pendingApproval: PendingWebApproval | null) => void;
  setSelectedEventIndex: (index: number | null) => void;
  finishRun: (status: string, finalAnswer: string) => void;
  reset: () => void;
}

const initialState = {
  task: DEFAULT_AGENT_TASK,
  status: "Idle",
  finalAnswer: "(empty)",
  isRunning: false,
  pendingApproval: null,
  fullEvents: [] as AgentEvent[],
  replayedEvents: [] as AgentEvent[],
  selectedEventIndex: null,
};

export const useAgentTimelineStore = create<AgentTimelineState>((set) => ({
  ...initialState,
  setTask: (task) => set({ task }),
  beginRun: () =>
    set({
      isRunning: true,
      status: "Streaming events...",
      finalAnswer: "(running)",
      pendingApproval: null,
      fullEvents: [],
      replayedEvents: [],
      selectedEventIndex: null,
    }),
  setStatus: (status) => set({ status }),
  setFinalAnswer: (finalAnswer) => set({ finalAnswer }),
  setFullEvents: (fullEvents) => set({ fullEvents }),
  setReplayedEvents: (replayedEvents) => set({ replayedEvents }),
  setPendingApproval: (pendingApproval) => set({ pendingApproval }),
  setSelectedEventIndex: (selectedEventIndex) => set({ selectedEventIndex }),
  finishRun: (status, finalAnswer) =>
    set({
      isRunning: false,
      status,
      finalAnswer,
      pendingApproval: null,
    }),
  reset: () => set(initialState),
}));