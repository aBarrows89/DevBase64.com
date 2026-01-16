import { query } from "./_generated/server";

// Role hierarchy order (highest to lowest)
const ROLE_HIERARCHY = [
  "super_admin",
  "admin",
  "warehouse_director",
  "warehouse_manager",
  "department_manager",
  "payroll_manager",
  "coo",
] as const;

// Roles to exclude from org chart display (these are base-level roles)
// Users with these roles aren't shown since higher roles inherit their permissions
const EXCLUDED_ROLES = ["employee", "member"];

// Role display names
const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  warehouse_director: "Warehouse Director",
  warehouse_manager: "Warehouse Manager",
  department_manager: "Department Manager",
  payroll_manager: "Payroll Manager",
  coo: "COO",
  employee: "Employee",
  member: "Member",
};

// Base employee permissions that all roles inherit
const EMPLOYEE_PERMISSIONS = [
  "View own schedule",
  "Request time off",
  "View announcements",
  "Calendar",
  "Messages",
];

// Role-specific permissions - what makes each role unique
const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: [
    "Full system access",
    "Manage all users",
    "View all data",
    "System configuration",
    "Delete records",
    "Restore deleted records",
    "Hiring & HR",
    ...EMPLOYEE_PERMISSIONS,
  ],
  admin: [
    "Manage personnel",
    "Manage shifts & schedules",
    "Approve time off",
    "View reports",
    "Manage equipment",
    "Delete records (archived)",
    "Hiring & HR",
    "Onboarding docs",
    ...EMPLOYEE_PERMISSIONS,
  ],
  warehouse_director: [
    "Manage assigned locations",
    "View personnel",
    "Approve time off",
    "View reports",
    "Onboarding docs",
    ...EMPLOYEE_PERMISSIONS,
  ],
  warehouse_manager: [
    "Manage assigned locations",
    "View personnel",
    "Approve time off",
    "Manage shifts",
    "Onboarding docs",
    ...EMPLOYEE_PERMISSIONS,
  ],
  department_manager: [
    "Manage assigned departments",
    "View department personnel",
  ],
  payroll_manager: [
    "View timesheets",
    "Approve payroll",
    "Export to QuickBooks",
  ],
  coo: [
    "View operations",
    "View reports",
    "Manage announcements",
    ...EMPLOYEE_PERMISSIONS,
  ],
  employee: EMPLOYEE_PERMISSIONS,
  member: [
    "Basic access",
    "View dashboard",
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
        if (user.role === role && !seenEmails.has(user.email.toLowerCase())) {
          seenEmails.add(user.email.toLowerCase());
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
