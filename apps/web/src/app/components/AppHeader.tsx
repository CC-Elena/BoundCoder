import { ds } from "../design-system";

interface AppHeaderProps {
  status: string;
  finalAnswer: string;
  eventCount: number;
}

export function AppHeader({ status, finalAnswer, eventCount }: AppHeaderProps) {
  return (
    <header className={ds.headerBar}>
      <div>
        <div className={ds.headerTitle}>BoundCoder Timeline Studio</div>
        <div className={ds.headerMeta}>Event Protocol + Timeline Replay</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={ds.chip}>{status}</span>
        <span className={ds.chip}>{eventCount} event{eventCount === 1 ? "" : "s"}</span>
        <span className={ds.chip}>{finalAnswer}</span>
      </div>
    </header>
  );
}