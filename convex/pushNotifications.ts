import { v } from "convex/values";
import { internalMutation, internalAction } from "./_generated/server";

// Send push notification via Expo
async function sendExpoPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  const message = {
    to: expoPushToken,
    sound: "default",
    title,
    body,
    data,
  };

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Failed to send push notification:", error);
    return null;
  }
}

// Check for employees who have been clocked in for too long and send reminders
// This is an internal action that can be called from crons
export const sendClockOutReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];
    const tenHoursInMs = 10 * 60 * 60 * 1000;

    // Get all time entries for today
    const todayEntries = await ctx.runQuery(
      // @ts-ignore - internal API
      "timeEntries:getTodayEntries" as any,
      {}
    );

    // Find employees who are still clocked in
    const employeesStillClockedIn: {
      personnelId: string;
      clockInTime: number;
      userId?: string;
      expoPushToken?: string;
    }[] = [];

    // Group entries by personnel
    const entriesByPersonnel: Record<string, any[]> = {};
    for (const entry of todayEntries || []) {
      if (!entriesByPersonnel[entry.personnelId]) {
        entriesByPersonnel[entry.personnelId] = [];
      }
      entriesByPersonnel[entry.personnelId].push(entry);
    }

    // Check each employee's status
    for (const [personnelId, entries] of Object.entries(entriesByPersonnel)) {
      const sorted = entries.sort((a, b) => a.timestamp - b.timestamp);
      let isClockedIn = false;
      let clockInTime = 0;

      for (const entry of sorted) {
        if (entry.type === "clock_in") {
          isClockedIn = true;
          clockInTime = entry.timestamp;
        } else if (entry.type === "clock_out") {
          isClockedIn = false;
        }
      }

      // If still clocked in and been more than 10 hours
      if (isClockedIn && now - clockInTime >= tenHoursInMs) {
        employeesStillClockedIn.push({
          personnelId,
          clockInTime,
        });
      }
    }

    // Send push notifications to each employee
    let notificationsSent = 0;
    for (const emp of employeesStillClockedIn) {
      // Get user with push token
      const user = await ctx.runQuery(
        // @ts-ignore - internal API
        "users:getByPersonnelId" as any,
        { personnelId: emp.personnelId }
      );

      if (user?.expoPushToken) {
        const hoursWorked = Math.floor((now - emp.clockInTime) / (1000 * 60 * 60));
        await sendExpoPushNotification(
          user.expoPushToken,
          "Clock Out Reminder",
          `You've been clocked in for ${hoursWorked} hours. Don't forget to clock out when you're done!`,
          { type: "clock_out_reminder" }
        );
        notificationsSent++;
      }
    }

    return { checked: Object.keys(entriesByPersonnel).length, notificationsSent };
  },
});

// Send a push notification to a specific user
export const sendPushToUser = internalAction({
  args: {
    expoPushToken: v.string(),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await sendExpoPushNotification(
      args.expoPushToken,
      args.title,
      args.body,
      args.data
    );
  },
});
