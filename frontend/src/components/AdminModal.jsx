import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Check,
  CircleCheck,
  Eye,
  Mountain,
  PenTool,
  Ruler,
  Save,
  Square,
  Sun,
  CloudSun,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { listUsers, createUser, updateUserPermissions, deleteUser } from "../services/auth";

const ALL_TOOLS = [
  { id: "aoi", label: "AOI / Draw", icon: PenTool },
  { id: "daylight", label: "Daylight", icon: Sun },
  { id: "lineOfSight", label: "Line of Sight", icon: Eye },
  { id: "elevationProfile", label: "Elevation", icon: Mountain },
  { id: "distance", label: "Distance", icon: Ruler },
  { id: "area", label: "Area", icon: Square },
  { id: "weather", label: "Weather", icon: CloudSun },
];

const roleTag = {
  superadmin: "border-purple-400/40 bg-purple-400/12 text-purple-300",
  admin: "border-warn/40 bg-warn/12 text-warn",
  user: "border-accent/40 bg-accent/12 text-accent",
};

const fieldClass =
  "w-full rounded-lg border border-line bg-white/[0.04] px-3 py-2.5 text-[13px] font-medium text-ink outline-none transition-colors placeholder:text-ink-faint hover:border-line-strong focus:border-accent focus:bg-surface-1";

const formLabel =
  "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-muted";

export default function AdminModal({ currentUser, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("users");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create user form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [newPermissions, setNewPermissions] = useState([]);
  const [creating, setCreating] = useState(false);

  // Permission editing
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingPerms, setEditingPerms] = useState([]);

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const list = await listUsers();
      setUsers(list);
    } catch (e) {
      setError("Failed to load users: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      setError("Username and password are required.");
      return;
    }
    setCreating(true);
    setError("");
    setSuccess("");
    try {
      await createUser(newUsername.trim(), newPassword, newRole, newPermissions);
      setSuccess(`User "${newUsername}" created successfully.`);
      setNewUsername("");
      setNewPassword("");
      setNewRole("user");
      setNewPermissions([]);
      await fetchUsers();
      setTab("users");
    } catch (e) {
      setError("Failed to create user: " + e.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleSavePermissions(userId) {
    setError("");
    setSuccess("");
    try {
      await updateUserPermissions(userId, editingPerms);
      setSuccess("Permissions updated.");
      setEditingUserId(null);
      await fetchUsers();
    } catch (e) {
      setError("Failed to update: " + e.message);
    }
  }

  async function handleDeleteUser(userId) {
    setError("");
    setSuccess("");
    try {
      await deleteUser(userId);
      setSuccess("User deleted.");
      setConfirmDeleteId(null);
      await fetchUsers();
    } catch (e) {
      setError("Failed to delete user: " + e.message);
      setConfirmDeleteId(null);
    }
  }

  function togglePerm(perms, setPerms, toolId) {
    if (perms.includes(toolId)) {
      setPerms(perms.filter((p) => p !== toolId));
    } else {
      setPerms([...perms, toolId]);
    }
  }

  function permissionGrid(perms, setPerms) {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        {ALL_TOOLS.map((tool) => {
          const Icon = tool.icon;
          const checked = perms.includes(tool.id);
          return (
            <label
              key={tool.id}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-[11.5px] font-medium transition-colors ${checked
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-line bg-white/[0.03] text-ink-muted hover:bg-white/8"
                }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => togglePerm(perms, setPerms, tool.id)}
                className="h-3.5 w-3.5 cursor-pointer accent-[var(--color-accent)]"
              />
              <Icon size={13} />
              {tool.label}
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center ">
      <div className="flex max-h-[88vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-line bg-surface-2/95 shadow-panel backdrop-blur-xl">
        {/* ── Header ── */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/12 text-accent ring-1 ring-accent/25">
              <Users size={16} />
            </span>
            <h2 className="text-[14px] font-semibold tracking-tight text-ink">User management</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-bad/15 hover:text-bad"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex shrink-0 gap-1 border-b border-line px-5 pt-3">
          {[
            { id: "users", label: "Users", icon: Users },
            ...(currentUser?.role === "superadmin"
              ? [{ id: "create", label: "Create user", icon: UserPlus }]
              : []),
          ].map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTab(t.id); setError(""); setSuccess(""); }}
                className={`relative flex items-center gap-2 rounded-t-md px-3 py-2 text-[12px] font-semibold transition-colors ${isActive ? "text-accent" : "text-ink-muted hover:text-ink"
                  }`}
              >
                <Icon size={14} />
                {t.label}
                {isActive && (
                  <span className="absolute inset-x-1 -bottom-px h-[2px] rounded-full bg-accent" />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Body ── */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {error && (
            <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-bad/30 bg-bad/10 px-3 py-2.5 text-[11.5px] font-medium text-bad">
              <AlertTriangle size={14} className="mt-px shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div role="status" className="mb-4 flex items-start gap-2 rounded-lg border border-ok/30 bg-ok/10 px-3 py-2.5 text-[11.5px] font-medium text-ok">
              <CircleCheck size={14} className="mt-px shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* ── Users list ── */}
          {tab === "users" && (
            <div className="flex flex-col gap-2.5">
              {loading ? (
                <p className="py-10 text-center text-[12px] text-ink-muted">Loading users…</p>
              ) : users.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line py-10 text-center">
                  <Users size={22} className="mx-auto mb-2 text-ink-faint" />
                  <p className="text-[12px] font-semibold text-ink-muted">No users yet</p>
                  <p className="mt-1 text-[11px] text-ink-faint">Create one from the Create user tab.</p>
                </div>
              ) : (
                users.map((user) => {
                  const role =
                    user.role === "superadmin" || user.role === "admin" ? user.role : "user";
                  return (
                    <div key={user.id} className="rounded-xl border border-line bg-white/[0.02] p-3.5">
                      {/* Row header */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="truncate text-[13px] font-semibold text-ink">
                            {user.username}
                          </span>
                          <span
                            className={`shrink-0 rounded border px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wider ${roleTag[role]}`}
                          >
                            {role}
                          </span>
                        </div>

                        <div className="flex shrink-0 gap-1.5">
                          {/* Permissions edit button */}
                          {(currentUser?.role === "superadmin" || (currentUser?.role === "admin" && user.role === "user")) && (
                            <button
                              type="button"
                              onClick={() => {
                                if (editingUserId === user.id) {
                                  setEditingUserId(null);
                                } else {
                                  setEditingUserId(user.id);
                                  setEditingPerms([...(user.permissions || [])]);
                                  setSuccess("");
                                  setError("");
                                }
                              }}
                              className="rounded-md border border-line bg-white/[0.05] px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted transition-colors hover:bg-white/10 hover:text-ink"
                            >
                              {editingUserId === user.id ? "Cancel" : "Permissions"}
                            </button>
                          )}

                          {/* Delete user button (Superadmin only) */}
                          {currentUser?.role === "superadmin" && user.id !== currentUser.id && (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(user.id)}
                              title="Delete user"
                              className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-line text-ink-faint transition-colors hover:border-bad/40 hover:bg-bad/12 hover:text-bad"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Delete confirmation */}
                      {confirmDeleteId === user.id && (
                        <div className="mt-3 rounded-lg border border-bad/30 bg-bad/10 p-3">
                          <p className="text-[11.5px] text-bad">
                            Delete <b>{user.username}</b>? This can't be undone.
                          </p>
                          <div className="mt-2.5 flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user.id)}
                              className="flex items-center gap-1.5 rounded-md bg-bad px-3 py-1.5 text-[11px] font-semibold text-surface-0 transition-colors hover:bg-red-400"
                            >
                              <Trash2 size={12} />
                              Delete user
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-md border border-line bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold text-ink-muted transition-colors hover:bg-white/10 hover:text-ink"
                            >
                              Keep user
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Permission editor */}
                      {editingUserId === user.id && (
                        <div className="mt-3">
                          <span className={formLabel}>Tools this user can open</span>
                          {permissionGrid(editingPerms, setEditingPerms)}
                          <button
                            type="button"
                            onClick={() => handleSavePermissions(user.id)}
                            className="mt-3 flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-[12px] font-semibold text-surface-0 transition-colors hover:bg-accent-soft"
                          >
                            <Save size={14} />
                            Save permissions
                          </button>
                        </div>
                      )}

                      {/* Permission summary */}
                      {editingUserId !== user.id && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {user.role === "superadmin" || user.role === "admin" ? (
                            <span className="flex items-center gap-1 rounded border border-ok/30 bg-ok/10 px-1.5 py-0.5 text-[10px] font-semibold text-ok">
                              <Check size={10} />
                              All tools
                            </span>
                          ) : user.permissions?.length > 0 ? (
                            user.permissions.map((p) => (
                              <span
                                key={p}
                                className="rounded border border-line bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-ink-muted"
                              >
                                {ALL_TOOLS.find((t) => t.id === p)?.label || p}
                              </span>
                            ))
                          ) : (
                            <span className="rounded border border-line bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-medium text-ink-faint">
                              No tool access
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── Create user ── */}
          {tab === "create" && (
            <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
              <div>
                <label htmlFor="new-username" className={formLabel}>Username</label>
                <input
                  id="new-username"
                  className={fieldClass}
                  type="text"
                  placeholder="Enter username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="new-password" className={formLabel}>Password</label>
                <input
                  id="new-password"
                  className={fieldClass}
                  type="password"
                  placeholder="Enter password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="new-role" className={formLabel}>Role</label>
                <select
                  id="new-role"
                  className={`${fieldClass} cursor-pointer`}
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  <option value="user" className="bg-surface-1 text-ink">User</option>
                  {currentUser?.role === "superadmin" && (
                    <option value="admin" className="bg-surface-1 text-ink">Admin</option>
                  )}
                </select>
              </div>

              {newRole === "user" && (
                <div>
                  <span className={formLabel}>Tool permissions</span>
                  {permissionGrid(newPermissions, setNewPermissions)}
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-[12.5px] font-semibold text-surface-0 transition-colors hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
              >
                <UserPlus size={14} />
                {creating ? "Creating…" : "Create user"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
