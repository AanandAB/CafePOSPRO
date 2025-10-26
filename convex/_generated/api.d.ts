/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as dataExport from "../dataExport.js";
import type * as http from "../http.js";
import type * as inventory from "../inventory.js";
import type * as notifications from "../notifications.js";
import type * as orders from "../orders.js";
import type * as restaurant from "../restaurant.js";
import type * as router from "../router.js";
import type * as sales from "../sales.js";
import type * as seed from "../seed.js";
import type * as staff from "../staff.js";
import type * as tables from "../tables.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  auth: typeof auth;
  dataExport: typeof dataExport;
  http: typeof http;
  inventory: typeof inventory;
  notifications: typeof notifications;
  orders: typeof orders;
  restaurant: typeof restaurant;
  router: typeof router;
  sales: typeof sales;
  seed: typeof seed;
  staff: typeof staff;
  tables: typeof tables;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
