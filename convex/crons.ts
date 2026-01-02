import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run auto-archive every day at 2 AM UTC
crons.daily(
  "auto-archive-done-projects",
  { hourUTC: 2, minuteUTC: 0 },
  internal.projects.autoArchiveOldDoneProjects
);

export default crons;
