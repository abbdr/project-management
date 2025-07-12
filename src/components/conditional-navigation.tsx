"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "./navigation";

export function ConditionalNavigation() {
  const pathname = usePathname();

  // Hide navigation on login and register pages
  const hideNavigation = pathname === "/login" || pathname === "/register";

  if (hideNavigation) {
    return null;
  }

  return <Navigation />;
}
