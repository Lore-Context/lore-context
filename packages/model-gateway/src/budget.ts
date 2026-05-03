export interface ModelBudget {
  maxJobsPerHour: number;
  maxInputBytesPerJob: number;
  maxDailyJobs: number;
}

export interface BudgetState {
  jobsThisHour: number;
  jobsToday: number;
  hourResetAt: string;
  dayResetAt: string;
}

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  remaining: {
    jobsThisHour: number;
    jobsToday: number;
  };
}

export const DEFAULT_BUDGET: ModelBudget = {
  maxJobsPerHour: 60,
  maxInputBytesPerJob: 32_768,
  maxDailyJobs: 500,
};

export function checkBudget(
  inputBytes: number,
  budget: ModelBudget,
  state: BudgetState,
): BudgetCheckResult {
  if (inputBytes > budget.maxInputBytesPerJob) {
    return {
      allowed: false,
      reason: `input exceeds per-job limit of ${budget.maxInputBytesPerJob} bytes`,
      remaining: {
        jobsThisHour: Math.max(0, budget.maxJobsPerHour - state.jobsThisHour),
        jobsToday: Math.max(0, budget.maxDailyJobs - state.jobsToday),
      },
    };
  }
  if (state.jobsThisHour >= budget.maxJobsPerHour) {
    return {
      allowed: false,
      reason: "hourly job limit reached",
      remaining: {
        jobsThisHour: 0,
        jobsToday: Math.max(0, budget.maxDailyJobs - state.jobsToday),
      },
    };
  }
  if (state.jobsToday >= budget.maxDailyJobs) {
    return {
      allowed: false,
      reason: "daily job limit reached",
      remaining: { jobsThisHour: 0, jobsToday: 0 },
    };
  }
  return {
    allowed: true,
    remaining: {
      jobsThisHour: budget.maxJobsPerHour - state.jobsThisHour - 1,
      jobsToday: budget.maxDailyJobs - state.jobsToday - 1,
    },
  };
}
