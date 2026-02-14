/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth_connectedAccounts from "../auth/connectedAccounts.js";
import type * as auth_tokens from "../auth/tokens.js";
import type * as crons from "../crons.js";
import type * as ga4_sync from "../ga4/sync.js";
import type * as google_accounts from "../google/accounts.js";
import type * as google_exchangeCode from "../google/exchangeCode.js";
import type * as google_oauth from "../google/oauth.js";
import type * as google_sync from "../google/sync.js";
import type * as http from "../http.js";
import type * as lib_apiMappers from "../lib/apiMappers.js";
import type * as lib_crypto from "../lib/crypto.js";
import type * as lib_normalize from "../lib/normalize.js";
import type * as meta_leadSync from "../meta/leadSync.js";
import type * as meta_sync from "../meta/sync.js";
import type * as queries from "../queries.js";
import type * as tiktok_sync from "../tiktok/sync.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "auth/connectedAccounts": typeof auth_connectedAccounts;
  "auth/tokens": typeof auth_tokens;
  crons: typeof crons;
  "ga4/sync": typeof ga4_sync;
  "google/accounts": typeof google_accounts;
  "google/exchangeCode": typeof google_exchangeCode;
  "google/oauth": typeof google_oauth;
  "google/sync": typeof google_sync;
  http: typeof http;
  "lib/apiMappers": typeof lib_apiMappers;
  "lib/crypto": typeof lib_crypto;
  "lib/normalize": typeof lib_normalize;
  "meta/leadSync": typeof meta_leadSync;
  "meta/sync": typeof meta_sync;
  queries: typeof queries;
  "tiktok/sync": typeof tiktok_sync;
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
