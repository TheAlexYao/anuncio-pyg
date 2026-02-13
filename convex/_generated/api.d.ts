/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as ga4Sync from "../ga4Sync.js";
import type * as ga4SyncHelpers from "../ga4SyncHelpers.js";
import type * as googleAdsSync from "../googleAdsSync.js";
import type * as googleAdsSyncHelpers from "../googleAdsSyncHelpers.js";
import type * as googleAuth from "../googleAuth.js";
import type * as googleOAuth from "../googleOAuth.js";
import type * as googleTokenRefresh from "../googleTokenRefresh.js";
import type * as lib_crypto from "../lib/crypto.js";
import type * as metaAuth from "../metaAuth.js";
import type * as metaLeadHelpers from "../metaLeadHelpers.js";
import type * as metaLeadSync from "../metaLeadSync.js";
import type * as metaOAuth from "../metaOAuth.js";
import type * as metaSync from "../metaSync.js";
import type * as metaSyncHelpers from "../metaSyncHelpers.js";
import type * as queries from "../queries.js";
import type * as tiktokLeads from "../tiktokLeads.js";
import type * as tiktokLeadsMutations from "../tiktokLeadsMutations.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  ga4Sync: typeof ga4Sync;
  ga4SyncHelpers: typeof ga4SyncHelpers;
  googleAdsSync: typeof googleAdsSync;
  googleAdsSyncHelpers: typeof googleAdsSyncHelpers;
  googleAuth: typeof googleAuth;
  googleOAuth: typeof googleOAuth;
  googleTokenRefresh: typeof googleTokenRefresh;
  "lib/crypto": typeof lib_crypto;
  metaAuth: typeof metaAuth;
  metaLeadHelpers: typeof metaLeadHelpers;
  metaLeadSync: typeof metaLeadSync;
  metaOAuth: typeof metaOAuth;
  metaSync: typeof metaSync;
  metaSyncHelpers: typeof metaSyncHelpers;
  queries: typeof queries;
  tiktokLeads: typeof tiktokLeads;
  tiktokLeadsMutations: typeof tiktokLeadsMutations;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
