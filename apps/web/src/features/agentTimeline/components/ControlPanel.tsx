import { useState } from "react";
import type { PendingWebApproval } from "../web-approval";

interface ControlPanelProps {
  task: string;
  isRunning: boolean;
  status: string;
  finalAnswer: string;
  pendingApproval: PendingWebApproval | null;
  onTaskChange: (task: string) => void;
  onRun: () => void;
  onReset: () => void;
  onApprovePending: (rememberToolName?: boolean) => void;
  onRejectPending: (reason?: string) => void;
}

export function ControlPanel({
  task,
  isRunning,
  status,
  finalAnswer,
  pendingApproval,
  onTaskChange,
  onRun,
  onReset,
  onApprovePending,
  onRejectPending,
}: ControlPanelProps) {
  const [rejectReason, setRejectReason] = useState("");
  const [rememberToolName, setRememberToolName] = useState(true);

  return (
    <aside className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
      <label className="grid gap-2 text-sm text-slate-400">
        Demo Task
        <textarea
          value={task}
          onChange={(event) => onTaskChange(event.target.value)}
          disabled={isRunning}
          className="min-h-36 w-full resize-y rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 leading-6 text-slate-100 outline-none transition focus:border-sky-400/60 focus:ring-4 focus:ring-sky-400/10 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={onRun}
          disabled={isRunning}
          className="rounded-full bg-gradient-to-br from-brand-300 to-brand-100 px-4 py-3 font-semibold text-slate-950 shadow-[0_14px_30px_rgba(94,234,212,0.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRunning ? "Running..." : "Run demo"}
        </button>
        <button
          onClick={onReset}
          disabled={isRunning}
          className="rounded-full border border-white/10 bg-slate-900/70 px-4 py-3 font-semibold text-slate-100 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reset
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-4">
          <span className="mb-1 block text-xs text-slate-400">Status</span>
          <div className="break-words text-sm leading-6 text-slate-100">{status}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-4">
          <span className="mb-1 block text-xs text-slate-400">Final Answer</span>
          <div className="break-words text-sm leading-6 text-slate-100">{finalAnswer}</div>
        </div>
      </div>

      {pendingApproval ? (
        <div className="grid gap-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4">
          <div className="text-sm font-semibold text-amber-100">Pending Approval</div>
          <div className="grid gap-1 text-xs text-amber-50/85">
            <div>runtimeId: {pendingApproval.runtimeId}</div>
            <div>step: {pendingApproval.step}</div>
            <div>tool: {pendingApproval.toolCall.name}</div>
          </div>
          <pre className="whitespace-pre-wrap rounded-xl border border-amber-200/20 bg-slate-900/60 p-3 text-xs leading-5 text-slate-200">
            {JSON.stringify(pendingApproval.toolCall.parameters, null, 2)}
          </pre>
          <input
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Reject reason (optional)"
            className="rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/60"
          />
          <label className="flex items-center gap-2 text-xs text-amber-50/90">
            <input
              type="checkbox"
              checked={rememberToolName}
              onChange={(event) => setRememberToolName(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-slate-900/70"
            />
            Remember this tool for current run
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                onApprovePending(rememberToolName);
                setRejectReason("");
              }}
              className="rounded-full bg-emerald-300 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5"
            >
              Approve
            </button>
            <button
              onClick={() => {
                onRejectPending(rejectReason);
                setRejectReason("");
              }}
              className="rounded-full border border-rose-200/25 bg-rose-300/20 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:-translate-y-0.5"
            >
              Reject
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}