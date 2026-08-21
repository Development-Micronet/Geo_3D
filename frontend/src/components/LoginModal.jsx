import React, { useState } from "react";
import { AlertTriangle, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { login } from "../services/auth";

const LOGO_URL = "/logo.png";

const fieldClass =
  "w-full rounded-lg border border-line bg-white/[0.04] px-3.5 py-2.5 text-[13px] font-medium text-ink outline-none transition-colors placeholder:text-ink-faint hover:border-line-strong focus:border-accent focus:bg-surface-1";

export default function LoginModal({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="w-full max-w-[380px] overflow-hidden rounded-2xl border border-line bg-surface-2/95 ">
        {/* ── Header ── */}
        <div className="flex flex-col items-center border-b border-line px-8 pb-7 pt-9 text-center">
          <img
            src={LOGO_URL}
            alt="Micronet Solutions"
            className="mb-4 h-20 w-20 rounded-xl object-contain"
          />
          <h1 className="text-[26px] font-extrabold uppercase leading-none tracking-[0.18em] text-ink">
            Geo<span className="text-accent">-3D</span>
          </h1>
          <p className="mt-2 text-[11.5px] font-medium text-ink-muted">
            Micronet Solutions 3D GEO Studio
          </p>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-7">
          <div>
            <label
              htmlFor="geo-username"
              className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-muted"
            >
              Username
            </label>
            <input
              id="geo-username"
              className={fieldClass}
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="geo-password"
              className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-muted"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="geo-password"
                className={`${fieldClass} pr-10`}
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-muted transition-colors hover:text-ink focus:outline-none"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff size={16} className="shrink-0" />
                ) : (
                  <Eye size={16} className="shrink-0" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-bad/30 bg-bad/10 px-3 py-2.5 text-[11.5px] font-medium text-bad"
            >
              <AlertTriangle size={14} className="mt-px shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-[13px] font-semibold text-surface-0 transition-colors hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-[11px] text-ink-faint">
              Contact your administrator for access
            </p>
            <a
              href="mailto:hr@micronetsolutions.in"
              className="text-[11.5px] font-medium text-accent transition-colors hover:underline hover:text-accent-soft"
            >
              hr@micronetsolutions.in
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

