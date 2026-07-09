import { ControlPanel } from "../../features/agentTimeline/components/ControlPanel";

interface SidebarPanelProps {
  task: string;
  isRunning: boolean;
  status: string;
  finalAnswer: string;
  onTaskChange: (task: string) => void;
  onRun: () => void;
  onReset: () => void;
}

export function SidebarPanel(props: SidebarPanelProps) {
  return (
    <div className="xl:sticky xl:top-6">
      <ControlPanel {...props} />
    </div>
  );
}