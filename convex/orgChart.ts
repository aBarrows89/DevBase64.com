import { query } from "./_generated/server";

// RBAC Tier Hierarchy (T5 highest to T0 lowest)
const TIER_HIERARCHY = [5, 4, 3, 2, 1, 0] as const;

// Map roles to tiers
function getTier(role: string): number {
  switch (role) {
    case "super_admin":
      return 5;
    case "admin":
      return 4;
    case "warehouse_director":
      return 3;
    case "warehouse_manager":
    case "office_manager":
      return 2;
    case "department_manager":
    case "shift_lead":
      return 1;
    case "member":
    case "employee":
    default:
      return 0;
  }
}

// Roles to exclude from org chart display (T0 - base level employees)
const EXCLUDED_TIERS = [0];

// Tier display names
const TIER_LABELS: Record<number, string> = {
  5: "T5 - Super Admin",
  4: "T4 - Admin",
  3: "T3 - Director",
  2: "T2 - Manager",
  1: "T1 - Shift Lead",
  0: "T0 - Employee",
};

// Short tier labels for badges
const TIER_BADGE_LABELS: Record<number, string> = {
  5: "T5",
  4: "T4",
  3: "T3",
  2: "T2",
  1: "T1",
  0: "T0",
};

// Role display names (for individual cards)
const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  warehouse_director: "Warehouse Director",
  warehouse_manager: "Warehouse Manager",
  department_manager: "Department Manager",
  office_manager: "Office Manager",
  shift_lead: "Shift Lead",
  employee: "Employee",
  member: "Member",
};

// Tier badge colors (for UI)
const TIER_COLORS: Record<number, string> = {
  5: "purple",
  4: "cyan",
  3: "blue",
  2: "green",
  1: "amber",
  0: "slate",
};

// Tier-specific permissions summary
const TIER_PERMISSIONS: Record<number, string[]> = {
  5: [
    "Full system access",
    "Manage all users & admins",
    "View all locations",
    "Delete records (approve)",
    "Time change audit log",
    "Create company announcements",
    "Tech wizard access",
  ],
  4: [
    "Manage users (not T5)",
    "View all locations",
    "Manage job listings",
    "Bulk upload applications",
    "Manage equipment",
    "Reports access",
    "QuickBooks integration",
  ],
  3: [
    "View all locations",
    "Edit personnel info",
    "Schedule interviews",
    "Approve applications",
    "Mileage & expenses",
  ],
  2: [
    "Location-scoped access",
    "View & manage personnel",
    "Approve time (location)",
    "Manage call-offs",
    "Award merits",
  ],
  1: [
    "Department portal access",
    "Receive call-off notifications",
    "Department chat moderation",
  ],
  0: [
    "Employee portal access",
    "View own schedule",
    "Request time off",
    "Submit call-offs",
  ],
};

// Get org chart data grouped by tier level
export const getOrgChartData = query({
  args: {},
  handler: async (ctx) => {
    // Fetch all active users
    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Fetch all locations for name lookup
    const locations = await ctx.db.query("locations").collect();
    const locationMap = new Map(locations.map((l) => [l._id, l.name]));

    // Deduplicate users by email - keep only the highest tier
    const seenEmails = new Set<string>();
    const deduplicatedUsers: typeof users = [];

    // Process in tier order (highest first) so we keep the highest tier
    for (const tier of TIER_HIERARCHY) {
      for (const user of users) {
        const userTier = getTier(user.role);
        if (userTier !== tier) continue;

        const emailKey = (user.email || user._id).toLowerCase();
        if (!seenEmails.has(emailKey)) {
          seenEmails.add(emailKey);
          // Only add to display if not an excluded tier
          if (!EXCLUDED_TIERS.includes(tier)) {
            deduplicatedUsers.push(user);
          }
        }
      }
    }

    // Group users by tier
    const usersByTier: Record<number, typeof users> = {};
    for (const tier of TIER_HIERARCHY) {
      if (EXCLUDED_TIERS.includes(tier)) continue;
      usersByTier[tier] = deduplicatedUsers.filter((u) => getTier(u.role) === tier);
    }

    // Transform users to include tier and location names
    const transformUser = (user: (typeof users)[0]) => {
      const tier = getTier(user.role);
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roleLabel: ROLE_LABELS[user.role] || user.role,
        tier,
        tierBadge: TIER_BADGE_LABELS[tier],
        managedDepartments: user.managedDepartments || [],
        managedLocationNames: (user.managedLocationIds || [])
          .map((id) => locationMap.get(id))
          .filter(Boolean) as string[],
        // Special flags
        isFinalTimeApprover: user.isFinalTimeApprover || false,
        isPayrollProcessor: user.isPayrollProcessor || false,
        requiresDailyLog: user.requiresDailyLog || false,
      };
    };

    // Build display hierarchy (excluding T0)
    const displayTiers = TIER_HIERARCHY.filter((t) => !EXCLUDED_TIERS.includes(t));

    return {
      tierHierarchy: displayTiers,
      tierLabels: TIER_LABELS,
      tierBadgeLabels: TIER_BADGE_LABELS,
      tierPermissions: TIER_PERMISSIONS,
      tierColors: TIER_COLORS,
      roleLabels: ROLE_LABELS,
      usersByTier: Object.fromEntries(
        displayTiers.map((tier) => [tier, (usersByTier[tier] || []).map(transformUser)])
      ),
      totalUsers: deduplicatedUsers.length,
    };
  },
});
