import { API_BASE } from "./api";

async function handle(res) {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json();
}

function getAuthHeaders() {
  const userJson = localStorage.getItem("geo3d_user");
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      if (user && user.id) {
        return { "X-User-Id": String(user.id) };
      }
    } catch (e) {}
  }
  return {};
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const user = await handle(res);
  if (user) {
    localStorage.setItem("geo3d_user", JSON.stringify(user));
  }
  return user;
}

export function logout() {
  localStorage.removeItem("geo3d_user");
}

export function getCurrentUser() {
  const userJson = localStorage.getItem("geo3d_user");
  if (userJson) {
    try {
      return JSON.parse(userJson);
    } catch (e) {}
  }
  return null;
}

export async function listUsers() {
  const res = await fetch(`${API_BASE}/api/users`, {
    headers: { ...getAuthHeaders() },
  });
  return handle(res);
}

export async function createUser(username, password, role = "user", permissions = []) {
  const res = await fetch(`${API_BASE}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ username, password, role, permissions }),
  });
  return handle(res);
}

export async function updateUserPermissions(userId, permissions) {
  const res = await fetch(`${API_BASE}/api/users/${userId}/permissions`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ permissions }),
  });
  return handle(res);
}

export async function deleteUser(userId) {
  const res = await fetch(`${API_BASE}/api/users/${userId}`, {
    method: "DELETE",
    headers: { ...getAuthHeaders() },
  });
  return handle(res);
}
