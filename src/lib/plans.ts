export type Plan = 'solo' | 'team' | 'scale';

export interface PlanCapabilities {
  maxJobs: number;
  allowInvoicing: boolean;
  allowAutomation: boolean;
  allowAdvancedReporting: boolean;
  allowTeamDispatch: boolean;
}

export const PLAN_FEATURES: Record<Plan, PlanCapabilities> = {
  solo: {
    maxJobs: 5,
    allowInvoicing: false,
    allowAutomation: false,
    allowAdvancedReporting: false,
    allowTeamDispatch: false,
  },
  team: {
    maxJobs: 50,
    allowInvoicing: true,
    allowAutomation: false,
    allowAdvancedReporting: false,
    allowTeamDispatch: true,
  },
  scale: {
    maxJobs: Infinity,
    allowInvoicing: true,
    allowAutomation: true,
    allowAdvancedReporting: true,
    allowTeamDispatch: true,
  },
};
