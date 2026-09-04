/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth_identity from "../auth/identity.js";
import type * as auth_permissions from "../auth/permissions.js";
import type * as auth_stepUp from "../auth/stepUp.js";
import type * as auth_sysAdmin from "../auth/sysAdmin.js";
import type * as auth_tenant from "../auth/tenant.js";
import type * as branches from "../branches.js";
import type * as centralInventory from "../centralInventory.js";
import type * as inventory from "../inventory.js";
import type * as migrations_ingest from "../migrations/ingest.js";
import type * as sales from "../sales.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "auth/identity": typeof auth_identity;
  "auth/permissions": typeof auth_permissions;
  "auth/stepUp": typeof auth_stepUp;
  "auth/sysAdmin": typeof auth_sysAdmin;
  "auth/tenant": typeof auth_tenant;
  branches: typeof branches;
  centralInventory: typeof centralInventory;
  inventory: typeof inventory;
  "migrations/ingest": typeof migrations_ingest;
  sales: typeof sales;
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
