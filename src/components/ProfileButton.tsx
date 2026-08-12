"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { FaSignInAlt, FaSignOutAlt, FaSpinner } from "react-icons/fa";
import ThemeToggle from "@/components/ThemeToggle";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0";

export default function ProfileButton() {
  const { data: session, status } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleSignIn = () => {
    signIn("azuread");
  };

  const handleSignOut = () => {
    setIsDropdownOpen(false);
    // Land on the app root (no MAP_ID) after sign-out so any automatic
    // re-authentication doesn't loop back to a secured map.
    signOut({ callbackUrl: window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH || "") });
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="w-[60px] text-center flex flex-col items-center justify-center px-1 text-xs text-neutral h-[52px]" title="Loading...">
        <FaSpinner size={16} className="mt-1 mb-1 animate-spin" />
        <span>Loading</span>
      </div>
    );
  }

  // Not authenticated - show sign in button
  if (status === "unauthenticated" || !session) {
    return (
      <div
        className="w-[60px] text-center flex flex-col items-center justify-center cursor-pointer px-1 text-xs text-neutral h-[52px] hover:bg-black/5 dark:hover:bg-white/5"
        onClick={handleSignIn}
        title="Sign In"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
      >
        <FaSignInAlt size={16} className="mt-1 mb-1" />
        <span>Sign In</span>
      </div>
    );
  }

  // Authenticated - show profile dropdown
  const userEmail = session.user?.email || "User";
  const userName = session.user?.name || userEmail;
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className="w-[60px] text-center flex flex-col items-center justify-center cursor-pointer px-1 text-xs text-neutral h-[52px] hover:bg-black/5 dark:hover:bg-white/5"
        onClick={toggleDropdown}
        title={userName}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && toggleDropdown()}
        aria-expanded={isDropdownOpen}
        aria-haspopup="true"
      >
        <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium mt-1 mb-0.5">{userInitial}</div>
        <span className="truncate max-w-[58px]">Profile</span>
      </div>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="animate-dropdownFadeIn absolute right-0 top-[52px] bg-base-100 border border-base-300 shadow-lg rounded-b-md min-w-[220px] z-50 max-h-[calc(100vh-60px)] overflow-y-auto">
          {/* User Info Section */}
          <div className="px-4 py-3 border-b border-base-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center text-lg font-medium">{userInitial}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-base-content truncate">{userName}</p>
                <p className="text-xs text-base-content/60 truncate">{userEmail}</p>
              </div>
            </div>
          </div>

          {/* Roles Section (if any) */}
          {session.user?.roles && session.user.roles.length > 0 && (
            <div className="px-4 py-2 border-b border-base-300">
              <p className="text-xs text-base-content/60 mb-1">Roles:</p>
              <div className="flex flex-wrap gap-1">
                {session.user.roles.map((role, index) => (
                  <span key={index} className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                    {role}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Locations Section (if any) */}
          {session.user?.locations && session.user.locations.length > 0 && (
            <div className="px-4 py-2 border-b border-base-300">
              <p className="text-xs text-base-content/60 mb-1">Locations:</p>
              <div className="flex flex-wrap gap-1">
                {session.user.locations.map((location, index) => (
                  <span key={index} className="inline-block px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                    {location}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Sign Out Button */}
          <div className="px-2 py-2">
            <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-base-content hover:bg-base-200 rounded transition-colors">
              <FaSignOutAlt size={14} />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Version */}
          <div className="px-4 py-2 border-t border-base-300">
            <p className="text-xs text-base-content/70 text-center">Version {APP_VERSION}</p>
          </div>
        </div>
      )}
    </div>
  );
}
