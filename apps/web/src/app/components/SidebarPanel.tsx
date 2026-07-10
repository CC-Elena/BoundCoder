import { ControlPanel } from "../../features/agentTimeline/components/ControlPanel";
import type { PendingWebApproval } from "../../features/agentTimeline/web-approval";

interface SidebarPanelProps {
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

export function SidebarPanel(props: SidebarPanelProps) {
  return (
    <div className="xl:sticky xl:top-6">
      <ControlPanel {...props} />
    </div>
  );
}