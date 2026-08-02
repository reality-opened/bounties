"use client";

import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import HelpButton from "./HelpButton";
import type { TourPage } from "./types";
import { hasScanAccess } from "../utils/scans";

export default function HelpButtonMount() {
  const pathname = usePathname();
  const { user } = useUser();

  let page: TourPage | null = null;
  if (pathname === "/") {
    page = "landing";
  } else if (pathname.startsWith("/dashboard")) {
    page = hasScanAccess(user?.publicMetadata)
      ? "dashboard-approved"
      : "dashboard-waitlist";
  }

  if (!page) {
    return null;
  }

  return <HelpButton page={page} />;
}
