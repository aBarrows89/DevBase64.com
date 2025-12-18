/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiInterview from "../aiInterview.js";
import type * as aiMatching from "../aiMatching.js";
import type * as applications from "../applications.js";
import type * as auth from "../auth.js";
import type * as contactMessages from "../contactMessages.js";
import type * as dealerInquiries from "../dealerInquiries.js";
import type * as jobs from "../jobs.js";
import type * as messages from "../messages.js";
import type * as projects from "../projects.js";
import type * as repositories from "../repositories.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiInterview: typeof aiInterview;
  aiMatching: typeof aiMatching;
  applications: typeof applications;
  auth: typeof auth;
  contactMessages: typeof contactMessages;
  dealerInquiries: typeof dealerInquiries;
  jobs: typeof jobs;
  messages: typeof messages;
  projects: typeof projects;
  repositories: typeof repositories;
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
