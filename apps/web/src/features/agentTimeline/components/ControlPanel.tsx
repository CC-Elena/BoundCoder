interface ControlPanelProps {
  task: string;
  isRunning: boolean;
  status: string;
  finalAnswer: string;
  onTaskChange: (task: string) => void;
  onRun: () => void;
  onReset: () => void;
}

export function ControlPanel({
  task,
  isRunning,
  status,
  finalAnswer,
  onTaskChange,
  onRun,
  onReset,
}: ControlPanelProps) {
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
    </aside>
  );
}