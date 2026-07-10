import type { AgentEvent } from "@boundcoder/shared";

interface TimelineProps {
  events: AgentEvent[];
  selectedEventIndex: number | null;
  onSelectEventIndex: (index: number) => void;
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("zh-CN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function describeEvent(event: AgentEvent): { title: string; detail: string; badge: string } {
  switch (event.type) {
    case "run_start":
      return {
        title: "Agent run started",
        detail: `task = ${event.task}`,
        badge: "start",
      };
    case "assistant_message":
      if (event.message.kind === "tool_call" && event.message.toolCall) {
        return {
          title: `Model requested ${event.message.toolCall.name}`,
          detail: JSON.stringify(event.message.toolCall.parameters, null, 2),
          badge: `step ${event.step}`,
        };
      }
      return {
        title: "Model returned final text",
        detail: event.message.content,
        badge: `step ${event.step}`,
      };
    case "tool_result":
      return {
        title: event.toolResult.ok ? "Tool finished successfully" : "Tool failed",
        detail: event.toolResult.ok
          ? event.toolResult.output
          : event.toolResult.errorMessage ?? "unknown error",
        badge: `step ${event.step}`,
      };
    case "approval_requested":
      return {
        title: `Approval requested for ${event.toolCall.name}`,
        detail: JSON.stringify(event.toolCall.parameters, null, 2),
        badge: `step ${event.step}`,
      };
    case "approval_resolved":
      return {
        title: event.approved ? "Approval granted" : "Approval rejected",
        detail: event.approved ? "approved" : (event.reason ?? "no reason"),
        badge: `step ${event.step}`,
      };
    case "run_end":
      return {
        title: `Run ended: ${event.stopReason}`,
        detail: event.finalAnswer ?? "(no final answer)",
        badge: "end",
      };
    default:
      return {
        title: "Unknown event",
        detail: JSON.stringify(event),
        badge: "unknown",
      };
  }
}

export function Timeline({ events, selectedEventIndex, onSelectEventIndex }: TimelineProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 px-5 py-8 text-center text-slate-400">
        点击 Run demo 以后，这里会实时流式回放 run_start → assistant_message → tool_result → run_end。
      </div>
    );
  }

  return (
    <ol className="relative grid gap-4 pl-8 before:absolute before:bottom-2 before:left-[13px] before:top-2 before:w-px before:bg-gradient-to-b before:from-sky-400/20 before:to-brand-300/80">
      {events.map((event, index) => {
        const { title, detail, badge } = describeEvent(event);
        return (
          <li
            key={`${event.type}-${event.timestamp}-${badge}`}
            data-kind={event.type}
            onClick={() => onSelectEventIndex(index)}
            className={`${selectedEventIndex === index ? "ring-2 ring-brand-300/50" : ""} relative overflow-hidden rounded-[20px] border border-white/10 bg-slate-950/45 p-4 pl-5 shadow-[0_10px_30px_rgba(15,23,42,0.18)] animate-rise before:absolute before:-left-[22px] before:top-5 before:h-[14px] before:w-[14px] before:rounded-full before:border-[3px] before:border-slate-950/90 before:bg-sky-400 before:shadow-[0_0_0_5px_rgba(96,165,250,0.12)] data-[kind=run_start]:before:bg-brand-300 data-[kind=run_end]:before:bg-brand-300 data-[kind=tool_result]:before:bg-amber-300 data-[kind=assistant_message]:before:bg-sky-400`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="font-semibold text-slate-100">{title}</div>
              <div className="whitespace-nowrap text-xs text-slate-400">{formatTimestamp(event.timestamp)}</div>
            </div>
            <p className="mb-3 text-slate-100/90">
              <span className="inline-flex items-center rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-xs font-medium text-sky-100">
                {badge}
              </span>
            </p>
            <pre className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-slate-900/70 p-3 text-sm leading-6 text-slate-300">{detail}</pre>
          </li>
        );
      })}
    </ol>
  );
}