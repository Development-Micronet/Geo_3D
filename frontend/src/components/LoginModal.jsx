import React, { useState } from "react";
import { login } from "../services/auth";

export default function LoginModal({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter username and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const user = await login(username.trim(), password);
      onLogin(user);
    } catch (err) {
      setError(err.message || "Login failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={modalHeaderStyle}>
          <img
            src="https://media.licdn.com/dms/image/v2/C5103AQHPC-qbGnfG8g/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1569932828822?e=2147483647&v=beta&t=eBiVY2-wVaeHPJs8bz9XnPNk72ITTEakAlShx35baQU"
            alt="Micronet Solutions"
            style={loginLogoStyle}
          />
          <h2 style={titleStyle}>GEO - 3D</h2>
          <p style={subtitleStyle}>Micronet Solutions 3D GIS Viewer</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Username</label>
            <input
              style={inputStyle}
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input
              style={inputStyle}
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div style={errorStyle}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" style={submitBtnStyle} disabled={loading}>
            {loading ? "Signing in..." : "🔐 Sign In"}
          </button>
        </form>

        <div style={footerStyle}>
          Contact your administrator for access
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background: "rgba(0, 0, 0, 0.25)",
  backdropFilter: "blur(2px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalStyle = {
  background: "rgba(15, 23, 42, 0.88)",
  border: "1px solid rgba(255, 255, 255, 0.25)",
  backdropFilter: "blur(10px)",
  borderRadius: 16,
  padding: "36px 32px",
  width: 360,
  color: "#fff",
  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
};

const modalHeaderStyle = {
  textAlign: "center",
  marginBottom: 28,
};

const loginLogoStyle = {
  width: 72,
  height: 72,
  borderRadius: 14,
  objectFit: "contain",
  background: "#ffffff",
  padding: 4,
  border: "2px solid rgba(56, 189, 248, 0.5)",
  boxShadow: "0 0 24px rgba(56,189,248,0.25)",
  marginBottom: 8,
};

const titleStyle = {
  margin: 0,
  fontSize: 30,
  fontWeight: 900,
  color: "#90cdf4",
  letterSpacing: "3px",
  textShadow: "0 0 24px rgba(144,205,244,0.5)",
};

const subtitleStyle = {
  margin: "6px 0 0",
  fontSize: 12,
  color: "rgba(255,255,255,0.6)",
  fontWeight: 500,
};

const labelStyle = {
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
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: 8,
  padding: "10px 14px",
  color: "#fff",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s ease",
};

const errorStyle = {
  background: "rgba(239,68,68,0.15)",
  border: "1px solid rgba(239,68,68,0.4)",
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: 12,
  color: "#fca5a5",
  textShadow: "none",
};

const submitBtnStyle = {
  background: "linear-gradient(135deg, #3182ce, #2b6cb0)",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  fontSize: 14,
  fontWeight: 700,
  padding: "12px",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(49,130,206,0.4)",
  transition: "all 0.2s ease",
  marginTop: 4,
};

const footerStyle = {
  marginTop: 20,
  textAlign: "center",
  fontSize: 11,
  color: "rgba(255,255,255,0.4)",
};
