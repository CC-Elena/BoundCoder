import type { AgentEvent } from "@boundcoder/shared";
import { ds } from "../design-system";

interface InspectorPanelProps {
  events: AgentEvent[];
  selectedEventIndex: number | null;
  onSelectEventIndex: (index: number | null) => void;
}

function summarize(event: AgentEvent): string {
  switch (event.type) {
    case "run_start":
      return `Task: ${event.task}`;
    case "assistant_message":
      return event.message.kind === "tool_call" && event.message.toolCall
        ? `Model requested ${event.message.toolCall.name}`
        : "Model returned text";
    case "tool_result":
      return event.toolResult.ok ? "Tool succeeded" : `Tool failed: ${event.toolResult.errorMessage ?? "unknown"}`;
    case "run_end":
      return `Run ended with ${event.stopReason}`;
  }
}

export function InspectorPanel({ events, selectedEventIndex, onSelectEventIndex }: InspectorPanelProps) {
  const selectedEvent = selectedEventIndex !== null ? events[selectedEventIndex] : null;

  return (
    <aside className={ds.inspectorCard}>
      <div>
        <h2 className={ds.sectionHeading}>Inspector</h2>
        <div className={ds.sectionSubheading}>查看当前选中的事件详情，后面可以扩展为调试面板。</div>
      </div>

      <div className="grid gap-2">
        <label className="text-xs text-slate-400">Selected Event</label>
        <select
          className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400/60"
          value={selectedEventIndex ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            onSelectEventIndex(value === "" ? null : Number(value));
          }}
        >
          <option value="">Latest event</option>
          {events.map((event, index) => (
            <option key={`${event.type}-${event.timestamp}-${index}`} value={index}>
              {index + 1}. {summarize(event)}
            </option>
          ))}
        </select>
      </div>

      {selectedEvent ? (
        <div className="grid gap-3">
          <div className={ds.metricCard}>
            <span className={ds.metricLabel}>Type</span>
            <div className={ds.metricValue}>{selectedEvent.type}</div>
          </div>
          <div className={ds.metricCard}>
            <span className={ds.metricLabel}>Summary</span>
            <div className={ds.metricValue}>{summarize(selectedEvent)}</div>
          </div>
          <div className={ds.metricCard}>
            <span className={ds.metricLabel}>Payload</span>
            <pre className={ds.pre}>{JSON.stringify(selectedEvent, null, 2)}</pre>
          </div>
        </div>
      ) : (
        <div className={ds.inspectorEmpty}>当前没有选中的事件。运行 demo 后可通过下拉选择任一事件查看详情。</div>
      )}
    </aside>
  );
}