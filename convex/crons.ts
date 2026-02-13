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

// Sync GA4 metrics every 4 hours
crons.interval(
  "sync-ga4-metrics",
  { hours: 4 },
  internal.ga4Sync.syncAllGA4Properties
);

export default crons;
