import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Sync Meta campaigns every 4 hours
crons.interval(
  "sync-meta-campaigns",
  { hours: 4 },
  internal.metaSync.syncAllMetaAccounts
);

// Sync Meta leads every 15 minutes (leads expire after 90 days)
crons.interval(
  "sync-meta-leads",
  { minutes: 15 },
  internal.metaLeadSync.syncAllMetaLeads
);

export default crons;
