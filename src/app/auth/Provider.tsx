"use client";
import React, { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Do not set any basePath here - NextAuth will use NEXTAUTH_URL and our rewrites
  return <SessionProvider basePath={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/auth`}>{children}</SessionProvider>;
};

export default AuthProvider;
