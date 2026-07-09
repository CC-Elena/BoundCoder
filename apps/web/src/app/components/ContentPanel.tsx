import { Timeline } from "../../features/agentTimeline/components/Timeline";
import type { AgentEvent } from "@boundcoder/shared";
import { ds } from "../design-system";

interface ContentPanelProps {
  events: AgentEvent[];
  selectedEventIndex: number | null;
  onSelectEventIndex: (index: number | null) => void;
}

export function ContentPanel({ events, selectedEventIndex, onSelectEventIndex }: ContentPanelProps) {
  return (
    <section className={ds.panel}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <h2 className={ds.sectionHeading}>Execution Timeline</h2>
          <div className={ds.sectionSubheading}>事件会在生成后立即进入流式回放，方便观察运行轨迹。</div>
        </div>
        <div className={ds.chip}>
          {events.length} event{events.length === 1 ? "" : "s"}
        </div>
      </div>
      <Timeline
        events={events}
        selectedEventIndex={selectedEventIndex}
        onSelectEventIndex={(index) => onSelectEventIndex(index)}
      />
    </section>
  );
}