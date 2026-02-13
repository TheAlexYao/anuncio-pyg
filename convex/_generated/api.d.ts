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
import type * as googleAdsSync from "../googleAdsSync.js";
import type * as googleAdsSyncHelpers from "../googleAdsSyncHelpers.js";
import type * as googleAuth from "../googleAuth.js";
import type * as googleOAuth from "../googleOAuth.js";
import type * as metaAuth from "../metaAuth.js";
import type * as metaLeadHelpers from "../metaLeadHelpers.js";
import type * as metaLeadSync from "../metaLeadSync.js";
import type * as metaOAuth from "../metaOAuth.js";
import type * as metaSync from "../metaSync.js";
import type * as metaSyncHelpers from "../metaSyncHelpers.js";
import type * as queries from "../queries.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  googleAdsSync: typeof googleAdsSync;
  googleAdsSyncHelpers: typeof googleAdsSyncHelpers;
  googleAuth: typeof googleAuth;
  googleOAuth: typeof googleOAuth;
  metaAuth: typeof metaAuth;
  metaLeadHelpers: typeof metaLeadHelpers;
  metaLeadSync: typeof metaLeadSync;
  metaOAuth: typeof metaOAuth;
  metaSync: typeof metaSync;
  metaSyncHelpers: typeof metaSyncHelpers;
  queries: typeof queries;
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
