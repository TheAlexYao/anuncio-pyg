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
import type * as google_exchangeCode from "../google/exchangeCode.js";
import type * as google_oauth from "../google/oauth.js";
import type * as http from "../http.js";
import type * as lib_crypto from "../lib/crypto.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "auth/connectedAccounts": typeof auth_connectedAccounts;
  "auth/tokens": typeof auth_tokens;
  "google/exchangeCode": typeof google_exchangeCode;
  "google/oauth": typeof google_oauth;
  http: typeof http;
  "lib/crypto": typeof lib_crypto;
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
