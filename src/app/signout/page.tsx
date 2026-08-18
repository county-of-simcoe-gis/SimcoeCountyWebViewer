"use client";

import { signOut } from "next-auth/react";
import { useEffect } from "react";

export default function SignOut() {
  useEffect(() => {
    // Automatically sign out
    signOut({
      callbackUrl: window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH || ""),
    });
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Signing out...</h1>
        <p>Please wait while we sign you out.</p>
      </div>
    </div>
  );
}
