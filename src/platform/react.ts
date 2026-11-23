"use client";

import { useSyncExternalStore } from "react";
import { hasCapability, type Capability } from "./capabilities";

const noop = () => () => {};

/** True when the browser has the capability. False during server rendering. */
export function useCapability(capability: Capability): boolean {
  return useSyncExternalStore(
    noop,
    () => hasCapability(capability),
    () => false,
  );
}

/** True after hydration, on the client. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
