"use client";

import { signIn } from "next-auth/react";
import { useEffect } from "react";

export default function SignIn() {
  useEffect(() => {
    // Automatically trigger the Azure AD sign-in flow with a callback to the homepage
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    // Set callbackUrl to homepage rather than sign in page
    signIn("azuread", {
      callbackUrl: window.location.origin + basePath + "/",
    });
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting to sign in...</h1>
        <p>Please wait while we redirect you to the authentication page.</p>
      </div>
    </div>
  );
}
