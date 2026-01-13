import { query } from "./_generated/server";

// Role hierarchy order (highest to lowest)
const ROLE_HIERARCHY = [
  "super_admin",
  "admin",
  "warehouse_director",
  "warehouse_manager",
  "department_manager",
  "payroll_manager",
  "employee",
  "member",
] as const;

// Role display names
const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  warehouse_director: "Warehouse Director",
  warehouse_manager: "Warehouse Manager",
  department_manager: "Department Manager",
  payroll_manager: "Payroll Manager",
  employee: "Employee",
  member: "Member",
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

    // Group users by role
    const usersByRole: Record<string, typeof users> = {};
    for (const role of ROLE_HIERARCHY) {
      usersByRole[role] = users.filter((u) => u.role === role);
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
      usersByRole: Object.fromEntries(
        ROLE_HIERARCHY.map((role) => [role, usersByRole[role].map(transformUser)])
      ),
      totalUsers: users.length,
    };
  },
});
