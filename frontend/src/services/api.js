export function getApiBase() {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  const protocol = typeof window !== "undefined" && window.location.protocol ? window.location.protocol : "http:";
  const hostname = typeof window !== "undefined" && window.location.hostname ? window.location.hostname : "localhost";

  if (envUrl && envUrl.trim() !== "") {
    let clean = envUrl.trim().replace(/\/+$/, "");
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      try {
        const u = new URL(clean);
        if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
          u.hostname = hostname;
          return u.toString().replace(/\/+$/, "");
        }
      } catch (e) { }
    }
    return clean;
  }

  return `${protocol}//${hostname}:8000`;
}

export const API_BASE = getApiBase();

export function resolveLayerUrl(url) {
  if (!url) return url;
  const currentBase = getApiBase();
  if (url.startsWith("/")) {
    return `${currentBase}${url}`;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const parsedUrl = new URL(url);
      const parsedBase = new URL(currentBase);
      parsedUrl.protocol = parsedBase.protocol;
      parsedUrl.hostname = parsedBase.hostname;
      parsedUrl.port = parsedBase.port;
      return parsedUrl.toString();
    } catch (e) {
      return url;
    }
  }
  return url;
}

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
  const userJson = typeof localStorage !== "undefined" ? localStorage.getItem("geo3d_user") : null;
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      if (user && user.id) {
        return { "X-User-Id": String(user.id) };
      }
    } catch (e) { }
  }
  return {};
}

export async function uploadSlpk(file, onProgress) {
  const form = new FormData();
  form.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/upload`);
    const headers = getAuthHeaders();
    Object.entries(headers).forEach(([k, v]) => {
      xhr.setRequestHeader(k, v);
    });
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          reject(new Error(JSON.parse(xhr.responseText).detail));
        } catch {
          reject(new Error(xhr.statusText));
        }
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });
}

export async function listPackages() {
  const res = await fetch(`${API_BASE}/api/packages`);
  return handle(res);
}

export async function getPackage(id) {
  const res = await fetch(`${API_BASE}/api/packages/${id}`);
  return handle(res);
}

export async function deletePackage(id) {
  const res = await fetch(`${API_BASE}/api/packages/${id}`, {
    method: "DELETE",
    headers: { ...getAuthHeaders() },
  });
  return handle(res);
}

