"use client";

import { usePathname } from "next/navigation";
import { moduleFromPath, type ModuleId } from "@/nav";
import { useAppStore } from "@/state";

/** The current module: the switch logic sets it at once; before the first switch the URL gives it. */
export function useCurrentModule(): ModuleId | null {
  const fromStore = useAppStore((s) => s.session.currentModule);
  const pathname = usePathname();
  return fromStore ?? moduleFromPath(pathname);
}
