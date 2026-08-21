import React from "react";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";

const roleTag = {
  superadmin: "border-purple-400/40 bg-purple-400/12 text-purple-300",
  admin: "border-warn/40 bg-warn/12 text-warn",
  user: "border-accent/40 bg-accent/12 text-accent",
};

const roleLabel = {
  superadmin: "Superadmin",
  admin: "Admin",
  user: "User",
};

/**
 * Presentational profile menu. Open state and all actions are owned by App.
 */
export default function UserMenu({
  currentUser,
  isOpen,
  onToggle,
  onClose,
  onManageUsers,
  onLogout,
}) {
  const role = currentUser.role === "superadmin" || currentUser.role === "admin"
    ? currentUser.role
    : "user";

  return (
    <div className="relative">
      {isOpen && <div className="fixed inset-0 z-[199]" onClick={onClose} />}

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title="Profile & settings"
        className="flex items-center gap-2 rounded-full border border-line bg-white/[0.04] py-1 pl-1 pr-2 transition-colors hover:bg-white/10"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/25 text-white ring-1 ring-accent/40">
          <User size={13} strokeWidth={2.2} className="text-white" />
        </span>
        <span className="hidden max-w-[110px] truncate text-[11.5px] font-semibold text-white sm:block">
          {currentUser.username}
        </span>
        <ChevronDown
          size={13}
          className={`text-white transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] z-[201] w-60 overflow-hidden rounded-xl border border-line bg-surface-2/95 shadow-panel backdrop-blur-xl"
        >
          <div className="flex items-center gap-3 border-b border-line px-3.5 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/12 text-accent ring-1 ring-accent/25">
              <User size={17} strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-ink" title={currentUser.username}>
                {currentUser.username}
              </div>
              <span
                className={`mt-1 inline-block rounded border px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wider ${roleTag[role]}`}
              >
                {roleLabel[role]}
              </span>
            </div>
          </div>

          <div className="p-1.5">
            {(currentUser.role === "admin" || currentUser.role === "superadmin") && (
              <button
                type="button"
                role="menuitem"
                onClick={onManageUsers}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-ink-muted transition-colors hover:bg-white/8 hover:text-ink"
              >
                <Settings size={14} />
                Manage users
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={onLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-ink-muted transition-colors hover:bg-bad/12 hover:text-bad"
            >
              <LogOut size={14} />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
