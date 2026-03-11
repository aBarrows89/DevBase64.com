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

// Send weekly daily log digest to admins every Monday at 9 AM EST (14:00 UTC)
crons.weekly(
  "weekly-daily-log-digest",
  { dayOfWeek: "monday", hourUTC: 14, minuteUTC: 0 },
  internal.dailyLogs.sendWeeklyDigestEmails
);

// Clean up dealer rebate uploads older than 12 months - runs monthly on the 1st
crons.monthly(
  "cleanup-old-dealer-rebate-uploads",
  { day: 1, hourUTC: 6, minuteUTC: 0 },
  internal.dealerRebates.deleteOldUploads
);

// ============ EMAIL CLIENT CRONS ============

// Sync all email accounts every 5 minutes
crons.interval(
  "email-sync-all-accounts",
  { minutes: 5 },
  internal.email.sync.syncAllAccounts
);

// Clean up old cached emails (older than 30 days) - runs daily at 4 AM UTC
crons.daily(
  "email-cleanup-old-emails",
  { hourUTC: 4, minuteUTC: 0 },
  internal.email.emails.cleanupOldEmails
);

export default crons;
