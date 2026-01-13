/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as aiInterview from "../aiInterview.js";
import type * as aiMatching from "../aiMatching.js";
import type * as aiTasks from "../aiTasks.js";
import type * as announcements from "../announcements.js";
import type * as applications from "../applications.js";
import type * as arp from "../arp.js";
import type * as attendance from "../attendance.js";
import type * as auditLogs from "../auditLogs.js";
import type * as auth from "../auth.js";
import type * as bulkUpload from "../bulkUpload.js";
import type * as callOffs from "../callOffs.js";
import type * as contactMessages from "../contactMessages.js";
import type * as crons from "../crons.js";
import type * as dealerInquiries from "../dealerInquiries.js";
import type * as documents from "../documents.js";
import type * as employeeChat from "../employeeChat.js";
import type * as employeePortal from "../employeePortal.js";
import type * as equipment from "../equipment.js";
import type * as events from "../events.js";
import type * as jobs from "../jobs.js";
import type * as locations from "../locations.js";
import type * as merits from "../merits.js";
import type * as messages from "../messages.js";
import type * as migrations from "../migrations.js";
import type * as mileage from "../mileage.js";
import type * as notifications from "../notifications.js";
import type * as onboardingDocuments from "../onboardingDocuments.js";
import type * as overtime from "../overtime.js";
import type * as payrollCompanies from "../payrollCompanies.js";
import type * as personnel from "../personnel.js";
import type * as projectSuggestions from "../projectSuggestions.js";
import type * as projects from "../projects.js";
import type * as pushNotifications from "../pushNotifications.js";
import type * as quickbooks from "../quickbooks.js";
import type * as reports from "../reports.js";
import type * as safetyChecklist from "../safetyChecklist.js";
import type * as search from "../search.js";
import type * as shiftTemplates from "../shiftTemplates.js";
import type * as shifts from "../shifts.js";
import type * as systemBanners from "../systemBanners.js";
import type * as tasks from "../tasks.js";
import type * as timeClock from "../timeClock.js";
import type * as timeOffRequests from "../timeOffRequests.js";
import type * as timesheetApprovals from "../timesheetApprovals.js";
import type * as writeUps from "../writeUps.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  aiInterview: typeof aiInterview;
  aiMatching: typeof aiMatching;
  aiTasks: typeof aiTasks;
  announcements: typeof announcements;
  applications: typeof applications;
  arp: typeof arp;
  attendance: typeof attendance;
  auditLogs: typeof auditLogs;
  auth: typeof auth;
  bulkUpload: typeof bulkUpload;
  callOffs: typeof callOffs;
  contactMessages: typeof contactMessages;
  crons: typeof crons;
  dealerInquiries: typeof dealerInquiries;
  documents: typeof documents;
  employeeChat: typeof employeeChat;
  employeePortal: typeof employeePortal;
  equipment: typeof equipment;
  events: typeof events;
  jobs: typeof jobs;
  locations: typeof locations;
  merits: typeof merits;
  messages: typeof messages;
  migrations: typeof migrations;
  mileage: typeof mileage;
  notifications: typeof notifications;
  onboardingDocuments: typeof onboardingDocuments;
  overtime: typeof overtime;
  payrollCompanies: typeof payrollCompanies;
  personnel: typeof personnel;
  projectSuggestions: typeof projectSuggestions;
  projects: typeof projects;
  pushNotifications: typeof pushNotifications;
  quickbooks: typeof quickbooks;
  reports: typeof reports;
  safetyChecklist: typeof safetyChecklist;
  search: typeof search;
  shiftTemplates: typeof shiftTemplates;
  shifts: typeof shifts;
  systemBanners: typeof systemBanners;
  tasks: typeof tasks;
  timeClock: typeof timeClock;
  timeOffRequests: typeof timeOffRequests;
  timesheetApprovals: typeof timesheetApprovals;
  writeUps: typeof writeUps;
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
