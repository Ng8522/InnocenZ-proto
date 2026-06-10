import { WELCOME_PATH } from "@/lib/nav-back";

/** Full URL to the role-picker welcome screen (respects Vite base path). */
export function welcomeHref(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return base ? `${base}${WELCOME_PATH}` : WELCOME_PATH;
}

/** Leave any portal and return to the welcome / role-picker screen. */
export function goToWelcome() {
  window.location.assign(welcomeHref());
}
