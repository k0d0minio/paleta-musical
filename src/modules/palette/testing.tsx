import type { ReactElement } from "react";
import { vi } from "vitest";
import { NavigatorProvider, type Navigator } from "@/nav";
import { renderWithProviders } from "../../../tests/unit/render";

/**
 * Test helper: renders a module view with a fake navigator. The test file
 * must also mock `next/navigation` (useSearchParams) with vi.mock.
 */
export function renderModule(ui: ReactElement) {
  const goTo = vi.fn<Navigator["goTo"]>();
  const navigator: Navigator = { goTo, syncFromRoute: vi.fn() };
  const view = renderWithProviders(
    <NavigatorProvider value={navigator}>{ui}</NavigatorProvider>,
  );
  return { ...view, goTo };
}
