import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Sync Meta campaigns every 4 hours
crons.interval(
  "sync-meta-campaigns",
  { hours: 4 },
  internal.metaSync.syncAllMetaAccounts
);

// Sync Meta leads every 15 minutes
crons.interval(
  "sync-meta-leads",
  { minutes: 15 },
  internal.metaLeadSync.syncAllMetaLeads
);

// Sync Google Ads campaigns every 4 hours
crons.interval(
  "sync-google-ads-campaigns",
  { hours: 4 },
  internal.googleAdsSync.syncAllGoogleAdsAccounts
);

export default crons;
