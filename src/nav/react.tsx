"use client";

import { createContext, useContext } from "react";
import type { Navigator } from "./navigator";

const NavigatorContext = createContext<Navigator | null>(null);

export const NavigatorProvider = NavigatorContext.Provider;

/** The one navigation function. Use it for every module switch and every cross-module link. */
export function useGoTo(): Navigator["goTo"] {
  const navigator = useContext(NavigatorContext);
  if (!navigator)
    throw new Error("useGoTo needs the NavigatorProvider of the app shell");
  return navigator.goTo;
}

export function useNavigator(): Navigator {
  const navigator = useContext(NavigatorContext);
  if (!navigator)
    throw new Error(
      "useNavigator needs the NavigatorProvider of the app shell",
    );
  return navigator;
}
