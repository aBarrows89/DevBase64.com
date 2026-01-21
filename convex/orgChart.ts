import { query } from "./_generated/server";

// Role hierarchy order (highest to lowest)
const ROLE_HIERARCHY = [
  "super_admin",
  "admin",
  "warehouse_director",
  "warehouse_manager",
  "department_manager",
  "office_manager",
] as const;

// Roles to exclude from org chart display (these are base-level roles)
const EXCLUDED_ROLES = ["employee", "member"];

// Role display names
const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  warehouse_director: "Warehouse Director",
  warehouse_manager: "Warehouse Manager",
  department_manager: "Department Manager",
  office_manager: "Office Manager",
  employee: "Employee",
  member: "Member",
};

// Role-specific permissions - aligned with auth-context.tsx
const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: [
    "Full system access",
    "Manage all users & admins",
    "View all locations",
    "Delete records",
    "Edit personnel info",
    "Approve time off",
    "Manage announcements",
    "Moderate chat",
    "Hiring & ATS",
  ],
  admin: [
    "Manage users (not admins)",
    "View all locations",
    "Edit personnel info",
    "Approve time off",
    "Manage announcements",
    "Moderate chat",
    "Hiring & ATS",
  ],
  warehouse_director: [
    "Manage users",
    "View all locations",
    "Edit shifts",
    "Edit personnel info",
    "Approve time off",
    "Manage call-offs",
    "Manage announcements",
    "Moderate chat",
  ],
  warehouse_manager: [
    "View assigned locations only",
    "View & manage personnel",
    "Edit shifts (assigned locations)",
    "Manage call-offs",
  ],
  department_manager: [
    "View assigned departments",
    "Manage department personnel",
    "Manage call-offs",
    "Moderate chat",
    "Department portal access",
  ],
  office_manager: [
    "Limited access",
    "No personnel management",
    "No equipment access",
    "No employee portal admin",
  ],
  employee: [
    "Employee portal access",
    "View own schedule",
    "Request time off",
    "Call off",
    "View announcements",
  ],
  member: [
    "View shifts",
    "Basic dashboard access",
  ],
};

// Get org chart data grouped by role level
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

    // Deduplicate users by email - keep only the highest role
    // This handles cases where someone has multiple accounts
    const seenEmails = new Set<string>();
    const deduplicatedUsers: typeof users = [];

    // All roles for processing (including employee/member for deduplication)
    const ALL_ROLES = [...ROLE_HIERARCHY, "employee", "member"] as const;

    // Process in hierarchy order (highest first) so we keep the highest role
    for (const role of ALL_ROLES) {
      for (const user of users) {
        const emailKey = (user.email || user._id).toLowerCase();
        if (user.role === role && !seenEmails.has(emailKey)) {
          seenEmails.add(emailKey);
          // Only add to display if not an excluded role
          if (!EXCLUDED_ROLES.includes(role)) {
            deduplicatedUsers.push(user);
          }
        }
      }
    }

    // Group users by role
    const usersByRole: Record<string, typeof users> = {};
    for (const role of ROLE_HIERARCHY) {
      usersByRole[role] = deduplicatedUsers.filter((u) => u.role === role);
    }

    // Transform users to include location names
    const transformUser = (user: (typeof users)[0]) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleLabel: ROLE_LABELS[user.role] || user.role,
      managedDepartments: user.managedDepartments || [],
      managedLocationNames: (user.managedLocationIds || [])
        .map((id) => locationMap.get(id))
        .filter(Boolean) as string[],
    });

    return {
      roleHierarchy: ROLE_HIERARCHY as unknown as string[],
      roleLabels: ROLE_LABELS,
      rolePermissions: ROLE_PERMISSIONS,
      usersByRole: Object.fromEntries(
        ROLE_HIERARCHY.map((role) => [role, usersByRole[role].map(transformUser)])
      ),
      totalUsers: deduplicatedUsers.length,
    };
  },
});
