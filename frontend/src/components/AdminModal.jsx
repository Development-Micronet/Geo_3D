import React, { useState, useEffect } from "react";
import { listUsers, createUser, updateUserPermissions, deleteUser } from "../services/auth";

const ALL_TOOLS = [
  { id: "aoi",              label: "✏️ AOI / Draw" },
  { id: "daylight",         label: "☀️ Daylight" },
  { id: "slice",            label: "🔪 Slice" },
  { id: "lineOfSight",      label: "👁️ Line of Sight" },
  { id: "elevationProfile", label: "⛰️ Elevation" },
  { id: "distance",         label: "📏 Distance" },
  { id: "area",             label: "📐 Area" },
  { id: "weather",          label: "⛅ Weather" },
];

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

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={titleStyle}>⚙️ Admin Dashboard</h2>
          <button style={closeBtnStyle} onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div style={tabBarStyle}>
          <button style={tab === "users" ? activeTabStyle : tabStyle} onClick={() => { setTab("users"); setError(""); setSuccess(""); }}>
            👥 Users
          </button>
          <button style={tab === "create" ? activeTabStyle : tabStyle} onClick={() => { setTab("create"); setError(""); setSuccess(""); }}>
            ➕ Create User
          </button>
        </div>

        {error && <div style={errorStyle}>⚠️ {error}</div>}
        {success && <div style={successStyle}>✅ {success}</div>}

        {/* ── Users List Tab ── */}
        {tab === "users" && (
          <div style={scrollArea}>
            {loading ? (
              <div style={emptyState}>Loading users...</div>
            ) : users.length === 0 ? (
              <div style={emptyState}>No users yet. Create one.</div>
            ) : (
              users.map((user) => (
                <div key={user.id} style={userCardStyle}>
                  {/* User row header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={usernameStyle}>{user.username}</span>
                      <span style={
                        user.role === "superadmin" ? superadminBadge
                        : user.role === "admin" ? adminBadge
                        : userBadge
                      }>
                        {user.role === "superadmin" ? "👤 Superadmin" : user.role === "admin" ? "👤 Admin" : "👤 User"}
                      </span>
                    </div>

                    {/* Action buttons — superadmin can edit/delete anyone; admin can only edit/delete regular users */}
                    {(currentUser?.role === "superadmin" || user.role === "user") && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          style={editBtnStyle}
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
                        >
                          {editingUserId === user.id ? "✕ Cancel" : "✏️ Permissions"}
                        </button>
                        <button
                          style={deleteBtnStyle}
                          onClick={() => setConfirmDeleteId(user.id)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Delete confirmation prompt */}
                  {confirmDeleteId === user.id && (
                    <div style={confirmBoxStyle}>
                      <span style={{ fontSize: 12, color: "#fca5a5" }}>Delete <b>{user.username}</b>? This cannot be undone.</span>
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button style={confirmDeleteBtnStyle} onClick={() => handleDeleteUser(user.id)}>
                          🗑️ Yes, Delete
                        </button>
                        <button style={cancelBtnStyle} onClick={() => setConfirmDeleteId(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Permission Editor */}
                  {editingUserId === user.id && (
                    <div style={{ marginTop: 8 }}>
                      <div style={permLabelStyle}>Select tools to enable:</div>
                      <div style={permGridStyle}>
                        {ALL_TOOLS.map((tool) => (
                          <label key={tool.id} style={permItemStyle}>
                            <input
                              type="checkbox"
                              checked={editingPerms.includes(tool.id)}
                              onChange={() => togglePerm(editingPerms, setEditingPerms, tool.id)}
                              style={{ accentColor: "#3182ce", marginRight: 6 }}
                            />
                            {tool.label}
                          </label>
                        ))}
                      </div>
                      <button style={{ ...saveBtnStyle, marginTop: 10 }} onClick={() => handleSavePermissions(user.id)}>
                        💾 Save Permissions
                      </button>
                    </div>
                  )}

                  {/* Permissions display (when not editing) */}
                  {editingUserId !== user.id && (
                    <div style={permTagsContainer}>
                      {user.role === "superadmin" || user.role === "admin" ? (
                        <span style={allAccessTag}>✅ All Tools</span>
                      ) : user.permissions?.length > 0 ? (
                        user.permissions.map((p) => (
                          <span key={p} style={permTag}>{ALL_TOOLS.find((t) => t.id === p)?.label || p}</span>
                        ))
                      ) : (
                        <span style={noPermTag}>No tool access</span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Create User Tab ── */}
        {tab === "create" && (
          <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={formLabelStyle}>Username</label>
              <input
                style={inputStyle}
                type="text"
                placeholder="Enter username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
            </div>
            <div>
              <label style={formLabelStyle}>Password</label>
              <input
                style={inputStyle}
                type="password"
                placeholder="Enter password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label style={formLabelStyle}>Role</label>
              <select
                style={selectStyle}
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="user" style={optionStyle}>👤 User</option>
                {currentUser?.role === "superadmin" && (
                  <option value="admin" style={optionStyle}>👑 Admin</option>
                )}
              </select>
            </div>
            {newRole === "user" && (
              <div>
                <div style={permLabelStyle}>Tool Permissions:</div>
                <div style={permGridStyle}>
                  {ALL_TOOLS.map((tool) => (
                    <label key={tool.id} style={permItemStyle}>
                      <input
                        type="checkbox"
                        checked={newPermissions.includes(tool.id)}
                        onChange={() => togglePerm(newPermissions, setNewPermissions, tool.id)}
                        style={{ accentColor: "#3182ce", marginRight: 6 }}
                      />
                      {tool.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <button type="submit" style={saveBtnStyle} disabled={creating}>
              {creating ? "Creating..." : "➕ Create User"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Styles ── */

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 9998,
  background: "rgba(0, 0, 0, 0.15)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalStyle = {
  background: "rgba(15, 23, 42, 0.95)",
  border: "1px solid rgba(255, 255, 255, 0.25)",
  borderRadius: 16,
  padding: "28px",
  width: 540,
  maxHeight: "88vh",
  display: "flex",
  flexDirection: "column",
  color: "#fff",
  boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
};

const titleStyle = {
  margin: 0,
  fontSize: 18,
  fontWeight: 900,
  color: "#90cdf4",
};

const closeBtnStyle = {
  background: "transparent",
  border: "none",
  color: "#94a3b8",
  fontSize: 18,
  cursor: "pointer",
};

const tabBarStyle = {
  display: "flex",
  gap: 8,
  marginBottom: 16,
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  paddingBottom: 12,
};

const tabStyle = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#94a3b8",
  padding: "6px 14px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
};

const activeTabStyle = {
  ...tabStyle,
  background: "rgba(49,130,206,0.3)",
  border: "1px solid #3182ce",
  color: "#90cdf4",
};

const errorStyle = {
  background: "rgba(239,68,68,0.15)",
  border: "1px solid rgba(239,68,68,0.4)",
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: 12,
  color: "#fca5a5",
  marginBottom: 12,
};

const successStyle = {
  background: "rgba(34,197,94,0.15)",
  border: "1px solid rgba(34,197,94,0.4)",
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: 12,
  color: "#86efac",
  marginBottom: 12,
};

const scrollArea = {
  overflowY: "auto",
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const emptyState = {
  textAlign: "center",
  color: "#64748b",
  fontSize: 12,
  padding: "20px 0",
};

const userCardStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  padding: "12px 14px",
};

const usernameStyle = {
  fontWeight: 700,
  fontSize: 14,
  color: "#e2e8f0",
};

const adminBadge = {
  fontSize: 10,
  fontWeight: 700,
  color: "#fbbf24",
  background: "rgba(251,191,36,0.15)",
  padding: "2px 8px",
  borderRadius: 4,
  border: "1px solid rgba(251,191,36,0.4)",
};

const superadminBadge = {
  fontSize: 10,
  fontWeight: 700,
  color: "#c084fc",
  background: "rgba(192,132,252,0.15)",
  padding: "2px 8px",
  borderRadius: 4,
  border: "1px solid rgba(192,132,252,0.45)",
};

const userBadge = {
  ...adminBadge,
  color: "#38bdf8",
  background: "rgba(56,189,248,0.1)",
  border: "1px solid rgba(56,189,248,0.3)",
};

const editBtnStyle = {
  background: "rgba(49,130,206,0.2)",
  border: "1px solid rgba(49,130,206,0.4)",
  color: "#90cdf4",
  fontSize: 11,
  fontWeight: 600,
  padding: "4px 10px",
  borderRadius: 5,
  cursor: "pointer",
};

const deleteBtnStyle = {
  background: "rgba(239,68,68,0.15)",
  border: "1px solid rgba(239,68,68,0.35)",
  color: "#fca5a5",
  fontSize: 11,
  fontWeight: 600,
  padding: "4px 10px",
  borderRadius: 5,
  cursor: "pointer",
};

const confirmBoxStyle = {
  background: "rgba(239,68,68,0.1)",
  border: "1px solid rgba(239,68,68,0.3)",
  borderRadius: 6,
  padding: "10px 12px",
  marginTop: 8,
};

const confirmDeleteBtnStyle = {
  background: "rgba(239,68,68,0.4)",
  border: "1px solid rgba(239,68,68,0.6)",
  color: "#fca5a5",
  fontSize: 11,
  fontWeight: 700,
  padding: "5px 12px",
  borderRadius: 5,
  cursor: "pointer",
};

const cancelBtnStyle = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 6,
  color: "#94a3b8",
  fontSize: 11,
  fontWeight: 600,
  padding: "5px 12px",
  cursor: "pointer",
};

const permLabelStyle = {
  fontSize: 10,
  color: "#90cdf4",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: 8,
};

const permGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "6px 12px",
};

const permItemStyle = {
  display: "flex",
  alignItems: "center",
  fontSize: 11,
  color: "#cbd5e1",
  cursor: "pointer",
  fontWeight: 500,
};

const permTagsContainer = {
  display: "flex",
  flexWrap: "wrap",
  gap: 5,
};

const permTag = {
  fontSize: 10,
  background: "rgba(49,130,206,0.15)",
  border: "1px solid rgba(49,130,206,0.3)",
  color: "#90cdf4",
  padding: "2px 8px",
  borderRadius: 4,
  fontWeight: 600,
};

const allAccessTag = {
  ...permTag,
  background: "rgba(34,197,94,0.1)",
  border: "1px solid rgba(34,197,94,0.3)",
  color: "#86efac",
};

const noPermTag = {
  ...permTag,
  background: "rgba(100,116,139,0.1)",
  border: "1px solid rgba(100,116,139,0.3)",
  color: "#64748b",
};

const saveBtnStyle = {
  background: "linear-gradient(135deg, #3182ce, #2b6cb0)",
  border: "none",
  borderRadius: 6,
  color: "#fff",
  fontSize: 12,
  fontWeight: 700,
  padding: "8px 16px",
  cursor: "pointer",
};

const formLabelStyle = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "#90cdf4",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: 6,
};

const inputStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 8,
  padding: "10px 14px",
  color: "#ffffff",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

// Select has explicit dark background + white text so options are always readable
const selectStyle = {
  width: "100%",
  background: "#1e2a3a",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 8,
  padding: "10px 14px",
  color: "#ffffff",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
  cursor: "pointer",
  appearance: "auto",
};

const optionStyle = {
  background: "#1e2a3a",
  color: "#ffffff",
};
