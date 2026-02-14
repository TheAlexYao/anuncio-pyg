import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "meta campaign sync",
  { hours: 4 },
  (internal as any).meta.sync.syncAllMetaAccounts,
  {}
);

crons.interval(
  "google ads campaign sync",
  { hours: 4 },
  (internal as any).google.sync.syncAllGoogleAdsAccounts,
  {}
);

crons.interval(
  "tiktok campaign sync",
  { hours: 4 },
  (internal as any).tiktok.sync.syncAllTikTokAccounts,
  {}
);

crons.interval(
  "meta lead sync",
  { minutes: 15 },
  (internal as any).meta.leadSync.syncAllMetaLeadAccounts,
  {}
);

crons.interval(
  "tiktok lead sync",
  { minutes: 15 },
  (internal as any).tiktok.sync.syncAllTikTokLeadAccounts,
  {}
);

crons.interval(
  "ga4 property sync",
  { hours: 4 },
  (internal as any).ga4.sync.syncAllGA4Properties,
  {}
);

export default crons;
