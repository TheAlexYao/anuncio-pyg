import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Sync Meta campaigns every 4 hours
crons.interval(
  "sync-meta-campaigns",
  { hours: 4 },
  internal.metaSync.syncAllMetaAccounts
);

export default crons;
