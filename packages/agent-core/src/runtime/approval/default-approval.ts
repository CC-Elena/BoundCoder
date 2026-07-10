import type { ApprovalHandler } from "./contracts.js";

export const AlwaysApproveHandler: ApprovalHandler = {
  async requestApproval() {
    return {
      approved: true,
    };
  },
};