import type { Locale } from "@/state";
import type { Messages } from "./config";

declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
