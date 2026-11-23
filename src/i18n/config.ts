import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/state";
import en from "./messages/en.json";
import ptPT from "./messages/pt-PT.json";

export type Messages = typeof ptPT;

export const MESSAGES: Record<Locale, Messages> = { "pt-PT": ptPT, en };

export { DEFAULT_LOCALE, LOCALES, type Locale };

export const TIME_ZONE = "Europe/Lisbon";
