"use client";

import type { KeyboardEvent } from "react";

/**
 * Roving focus for a row or grid of notes: one tab stop, arrow keys move the
 * focus. Put `onKeyDown` on the container and `data-roving` on each item.
 */
export function rovingKeyDown(
  event: KeyboardEvent<HTMLElement>,
  columns?: number,
): void {
  const items = [
    ...event.currentTarget.querySelectorAll<HTMLElement>(
      "[data-roving]:not([disabled])",
    ),
  ];
  const index = items.indexOf(document.activeElement as HTMLElement);
  if (index < 0) return;
  const cols = columns ?? items.length;
  const moves: Record<string, number> = {
    ArrowRight: 1,
    ArrowLeft: -1,
    ArrowDown: cols,
    ArrowUp: -cols,
    Home: -index,
    End: items.length - 1 - index,
  };
  const delta = moves[event.key];
  if (delta === undefined) return;
  event.preventDefault();
  const next = items[(index + delta + items.length) % items.length];
  for (const item of items) item.tabIndex = item === next ? 0 : -1;
  next?.focus();
}
