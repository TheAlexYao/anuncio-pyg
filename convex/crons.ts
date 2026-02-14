import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "meta-lead-sync",
  { minutes: 15 },
  internal.metaLeadSync.syncLeads
);

export default crons;
