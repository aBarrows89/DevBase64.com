import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run auto-archive every day at 2 AM UTC
crons.daily(
  "auto-archive-done-projects",
  { hourUTC: 2, minuteUTC: 0 },
  internal.projects.autoArchiveOldDoneProjects
);

// Run auto-expire old applications every day at 3 AM UTC
// Archives applications older than 45 days that are still in stagnant statuses
crons.daily(
  "auto-expire-old-applications",
  { hourUTC: 3, minuteUTC: 0 },
  internal.applications.autoExpireOldApplications
);

export default crons;
