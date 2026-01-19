"use client";

import { useState } from "react";
import Protected from "../protected";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "../auth-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface User {
  _id: Id<"users">;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  forcePasswordChange: boolean;
  createdAt: number;
  lastLoginAt?: number;
  managedLocationIds?: Id<"locations">[];
  managedDepartments?: string[];
}

function UsersContent() {
  const { user: currentUser } = useAuth();
  const users = useQuery(api.auth.getAllUsers);
  const locations = useQuery(api.locations.list);
  const createUser = useMutation(api.auth.createUser);
  const updateUser = useMutation(api.auth.updateUser);
  const resetPassword = useMutation(api.auth.resetUserPassword);
  const deleteUserMutation = useMutation(api.auth.deleteUser);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state for new user
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "member",
    sendWelcomeEmail: true,
  });

  // Form state for edit
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "",
    isActive: true,
    managedLocationIds: [] as Id<"locations">[],
    managedDepartments: [] as string[],
  });

  // Get departments from shift planning module for department_manager assignment
  const departments = useQuery(api.shifts.getDepartments) || [];

  // Form state for password reset
  const [newPassword, setNewPassword] = useState("");

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newUser.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    const result = await createUser({
      name: newUser.name,
      email: newUser.email,
      password: newUser.password,
      role: newUser.role,
      sendWelcomeEmail: newUser.sendWelcomeEmail,
    });

    if (result.success) {
      setSuccess(newUser.sendWelcomeEmail ? "User created and welcome email sent!" : "User created successfully");
      setShowAddModal(false);
      setNewUser({ name: "", email: "", password: "", role: "member", sendWelcomeEmail: true });
    } else {
      setError(result.error || "Failed to create user");
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setError("");
    setSuccess("");

    const result = await updateUser({
      userId: selectedUser._id,
      name: editForm.name,
      email: editForm.email,
      role: editForm.role,
      isActive: editForm.isActive,
      managedLocationIds: editForm.role === "warehouse_manager" ? editForm.managedLocationIds : undefined,
      managedDepartments: editForm.role === "department_manager" ? editForm.managedDepartments : undefined,
    });

    if (result.success) {
      setSuccess("User updated successfully");
      setShowEditModal(false);
      setSelectedUser(null);
    } else {
      setError(result.error || "Failed to update user");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    const result = await resetPassword({
      userId: selectedUser._id,
      newPassword,
    });

    if (result.success) {
      setSuccess("Password reset successfully. User will be required to change password on next login.");
      setShowResetModal(false);
      setNewPassword("");
      setSelectedUser(null);
    } else {
      setError("Failed to reset password");
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setError("");
    setSuccess("");

    const result = await deleteUserMutation({
      userId: selectedUser._id,
    });

    if (result.success) {
      setSuccess("User deleted successfully");
      setShowDeleteModal(false);
      setSelectedUser(null);
    } else {
      setError("Failed to delete user");
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      managedLocationIds: user.managedLocationIds || [],
      managedDepartments: user.managedDepartments || [],
    });
    setShowEditModal(true);
  };

  const toggleLocationAssignment = (locationId: Id<"locations">) => {
    setEditForm(prev => ({
      ...prev,
      managedLocationIds: prev.managedLocationIds.includes(locationId)
        ? prev.managedLocationIds.filter(id => id !== locationId)
        : [...prev.managedLocationIds, locationId],
    }));
  };

  const toggleDepartmentAssignment = (department: string) => {
    setEditForm(prev => ({
      ...prev,
      managedDepartments: prev.managedDepartments.includes(department)
        ? prev.managedDepartments.filter(d => d !== department)
        : [...prev.managedDepartments, department],
    }));
  };

  const openResetModal = (user: User) => {
    setSelectedUser(user);
    setNewPassword("");
    setShowResetModal(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-red-500/20 text-red-400";
      case "admin":
        return "bg-purple-500/20 text-purple-400";
      case "warehouse_director":
        return "bg-emerald-500/20 text-emerald-400";
      case "department_manager":
        return "bg-blue-500/20 text-blue-400";
      case "warehouse_manager":
        return "bg-orange-500/20 text-orange-400";
      case "office_manager":
        return "bg-pink-500/20 text-pink-400";
      case "member":
        return "bg-cyan-500/20 text-cyan-400";
      default:
        return "bg-slate-500/20 text-slate-400";
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "super_admin":
        return "Super Admin";
      case "admin":
        return "Admin";
      case "department_manager":
        return "Department Manager";
      case "warehouse_manager":
        return "Warehouse Manager";
      case "warehouse_director":
        return "Warehouse Director";
      case "office_manager":
        return "Office Manager";
      case "member":
        return "Member";
      default:
        return role;
    }
  };

  const getLocationNames = (locationIds?: Id<"locations">[]) => {
    if (!locationIds || locationIds.length === 0 || !locations) return null;
    return locationIds
      .map(id => locations.find(l => l._id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  const getDepartmentNames = (depts?: string[]) => {
    if (!depts || depts.length === 0) return null;
    return depts.join(", ");
  };

  return (
    <div className="flex h-screen bg-slate-900">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 px-4 sm:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white">User Management</h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 truncate">
                Manage admin users and their permissions
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 sm:px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Add User</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-8">
          {/* Success/Error Messages */}
          {success && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm sm:text-base">
              {success}
            </div>
          )}
          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm sm:text-base">
              {error}
            </div>
          )}

          {/* Users Table - Desktop */}
          <div className="hidden md:block bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {users?.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-white font-medium">{user.name}</div>
                        <div className="text-slate-400 text-sm">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                          {getRoleDisplayName(user.role)}
                        </span>
                        {user.role === "warehouse_manager" && (
                          <div className="text-xs text-slate-500 mt-1">
                            {getLocationNames(user.managedLocationIds as Id<"locations">[] | undefined) || "No locations assigned"}
                          </div>
                        )}
                        {user.role === "department_manager" && (
                          <div className="text-xs text-slate-500 mt-1">
                            {getDepartmentNames(user.managedDepartments as string[] | undefined) || "No departments assigned"}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.isActive
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}>
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                      {user.forcePasswordChange && (
                        <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-400">
                          Password Change Required
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "Never"
                      }
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(user as User)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                          title="Edit user"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openResetModal(user as User)}
                          className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Reset password"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </button>
                        {user._id !== currentUser?._id && (
                          <button
                            onClick={() => openDeleteModal(user as User)}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                            title="Delete user"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!users || users.length === 0) && (
              <div className="text-center py-12 text-slate-500">
                No users found
              </div>
            )}
          </div>

          {/* Users Cards - Mobile */}
          <div className="md:hidden space-y-3">
            {users?.map((user) => (
              <div
                key={user._id}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-white font-medium truncate">{user.name}</h3>
                    <p className="text-slate-400 text-sm truncate">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEditModal(user as User)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      title="Edit user"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openResetModal(user as User)}
                      className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Reset password"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </button>
                    {user._id !== currentUser?._id && (
                      <button
                        onClick={() => openDeleteModal(user as User)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Delete user"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                    {getRoleDisplayName(user.role)}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    user.isActive
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}>
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                  {user.forcePasswordChange && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-400">
                      Password Change Required
                    </span>
                  )}
                </div>
                {user.role === "warehouse_manager" && (
                  <div className="text-xs text-slate-500 mb-3">
                    Locations: {getLocationNames(user.managedLocationIds as Id<"locations">[] | undefined) || "None assigned"}
                  </div>
                )}
                {user.role === "department_manager" && (
                  <div className="text-xs text-slate-500 mb-3">
                    Departments: {getDepartmentNames(user.managedDepartments as string[] | undefined) || "None assigned"}
                  </div>
                )}

                <div className="text-slate-400 text-xs">
                  Last login: {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "Never"
                  }
                </div>
              </div>
            ))}
            {(!users || users.length === 0) && (
              <div className="text-center py-12 text-slate-500 bg-slate-800/50 border border-slate-700 rounded-xl">
                No users found
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">Add New User</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  required
                  minLength={8}
                />
                <p className="text-xs text-slate-500 mt-1">Minimum 8 characters. User will be required to change on first login.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="warehouse_director">Warehouse Director</option>
                  <option value="warehouse_manager">Warehouse Manager</option>
                  <option value="department_manager">Department Manager</option>
                  <option value="office_manager">Office Manager</option>
                  <option value="member">Member</option>
                </select>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <input
                  type="checkbox"
                  id="sendWelcomeEmail"
                  checked={newUser.sendWelcomeEmail}
                  onChange={(e) => setNewUser({ ...newUser, sendWelcomeEmail: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                />
                <label htmlFor="sendWelcomeEmail" className="text-sm text-slate-300 cursor-pointer">
                  Send welcome email with login credentials
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">Edit User</h2>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="warehouse_director">Warehouse Director</option>
                  <option value="warehouse_manager">Warehouse Manager</option>
                  <option value="department_manager">Department Manager</option>
                  <option value="office_manager">Office Manager</option>
                  <option value="member">Member</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-slate-400">Active</span>
                </label>
              </div>

              {/* Location Assignment for Warehouse Managers */}
              {editForm.role === "warehouse_manager" && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Assigned Locations
                  </label>
                  <p className="text-xs text-slate-500 mb-3">
                    Select which locations this warehouse manager can access
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                    {locations?.filter(loc => loc.isActive).map((location) => (
                      <label
                        key={location._id}
                        className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={editForm.managedLocationIds.includes(location._id)}
                          onChange={() => toggleLocationAssignment(location._id)}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                        />
                        <span className="text-white">{location.name}</span>
                        {location.warehouseManagerName && (
                          <span className="text-xs text-slate-500">
                            (Manager: {location.warehouseManagerName})
                          </span>
                        )}
                      </label>
                    ))}
                    {(!locations || locations.filter(loc => loc.isActive).length === 0) && (
                      <p className="text-slate-500 text-sm text-center py-4">No locations available</p>
                    )}
                  </div>
                  {editForm.managedLocationIds.length === 0 && (
                    <p className="text-amber-400 text-xs mt-2">
                      No locations selected. This user won&apos;t be able to access shift planning.
                    </p>
                  )}
                </div>
              )}

              {/* Department Assignment for Department Managers */}
              {editForm.role === "department_manager" && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Assigned Departments
                  </label>
                  <p className="text-xs text-slate-500 mb-3">
                    Select which departments this manager is responsible for
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                    {departments.length > 0 ? (
                      departments.map((department) => (
                        <label
                          key={department}
                          className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={editForm.managedDepartments.includes(department)}
                            onChange={() => toggleDepartmentAssignment(department)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                          />
                          <span className="text-white">{department}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-slate-500 text-sm text-center py-4">No departments available. Add personnel first.</p>
                    )}
                  </div>
                  {editForm.managedDepartments.length === 0 && departments.length > 0 && (
                    <p className="text-amber-400 text-xs mt-2">
                      No departments selected. This user won&apos;t see any shifts in the department portal.
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">Reset Password</h2>
            <p className="text-slate-400 mb-4">
              Reset password for <span className="text-white font-medium">{selectedUser.name}</span>
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  required
                  minLength={8}
                />
                <p className="text-xs text-slate-500 mt-1">Minimum 8 characters. User will be required to change on next login.</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setSelectedUser(null);
                    setNewPassword("");
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">Delete User</h2>
            <p className="text-slate-400 mb-4">
              Are you sure you want to delete <span className="text-white font-medium">{selectedUser.name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  return (
    <Protected>
      <UsersContent />
    </Protected>
  );
}
