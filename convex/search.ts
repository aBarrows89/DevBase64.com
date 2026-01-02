import { v } from "convex/values";
import { query } from "./_generated/server";

// Global search across all major tables
export const globalSearch = query({
  args: { searchQuery: v.string() },
  handler: async (ctx, args) => {
    const query = args.searchQuery.toLowerCase().trim();
    if (!query) return { results: [], totalCount: 0 };

    const results: Array<{
      type: "project" | "personnel" | "application" | "equipment" | "user";
      id: string;
      title: string;
      subtitle: string;
      href: string;
      icon: string;
    }> = [];

    // Search projects
    const projects = await ctx.db.query("projects").collect();
    for (const project of projects) {
      if (
        project.name.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query)
      ) {
        results.push({
          type: "project",
          id: project._id,
          title: project.name,
          subtitle: `Project - ${project.status}`,
          href: "/projects",
          icon: "folder",
        });
      }
    }

    // Search personnel
    const personnel = await ctx.db.query("personnel").collect();
    for (const person of personnel) {
      const fullName = `${person.firstName} ${person.lastName}`.toLowerCase();
      if (
        fullName.includes(query) ||
        person.position?.toLowerCase().includes(query) ||
        person.department?.toLowerCase().includes(query)
      ) {
        results.push({
          type: "personnel",
          id: person._id,
          title: `${person.firstName} ${person.lastName}`,
          subtitle: `${person.position} - ${person.department}`,
          href: `/personnel/${person._id}`,
          icon: "user",
        });
      }
    }

    // Search applications
    const applications = await ctx.db.query("applications").collect();
    for (const app of applications) {
      const fullName = `${app.firstName} ${app.lastName}`.toLowerCase();
      if (
        fullName.includes(query) ||
        app.email?.toLowerCase().includes(query)
      ) {
        results.push({
          type: "application",
          id: app._id,
          title: `${app.firstName} ${app.lastName}`,
          subtitle: `Applicant - ${app.status}`,
          href: `/applications/${app._id}`,
          icon: "document",
        });
      }
    }

    // Search scanners
    const scanners = await ctx.db.query("scanners").collect();
    for (const scanner of scanners) {
      if (
        scanner.number?.toLowerCase().includes(query) ||
        scanner.serialNumber?.toLowerCase().includes(query) ||
        scanner.model?.toLowerCase().includes(query)
      ) {
        results.push({
          type: "equipment",
          id: scanner._id,
          title: `Scanner #${scanner.number}`,
          subtitle: `${scanner.model || "Scanner"} - ${scanner.status}`,
          href: "/equipment",
          icon: "device",
        });
      }
    }

    // Search pickers
    const pickers = await ctx.db.query("pickers").collect();
    for (const picker of pickers) {
      if (
        picker.number?.toLowerCase().includes(query) ||
        picker.serialNumber?.toLowerCase().includes(query) ||
        picker.model?.toLowerCase().includes(query)
      ) {
        results.push({
          type: "equipment",
          id: picker._id,
          title: `Picker #${picker.number}`,
          subtitle: `${picker.model || "Picker"} - ${picker.status}`,
          href: "/equipment",
          icon: "device",
        });
      }
    }

    // Search users
    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      if (
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
      ) {
        results.push({
          type: "user",
          id: user._id,
          title: user.name,
          subtitle: `${user.role} - ${user.email}`,
          href: "/users",
          icon: "users",
        });
      }
    }

    // Return top 20 results
    return {
      results: results.slice(0, 20),
      totalCount: results.length,
    };
  },
});
