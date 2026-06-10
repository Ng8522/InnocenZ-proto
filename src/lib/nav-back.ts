/** Auto back targets for portal sub-routes */

const PORTAL_HUBS = ["/agency", "/outlet", "/host"] as const;

export type PortalHub = (typeof PORTAL_HUBS)[number];

export function getPortalHub(pathname: string): PortalHub | null {
  if (pathname.startsWith("/agency")) return "/agency";
  if (pathname.startsWith("/outlet")) return "/outlet";
  if (pathname.startsWith("/host")) return "/host";
  return null;
}

export function isPortalHub(pathname: string): boolean {
  const hub = getPortalHub(pathname);
  if (!hub) return false;
  const norm = pathname.replace(/\/$/, "") || pathname;
  return norm === hub;
}

/** Default back route: sub-page → portal hub, hub → welcome */
export function getAutoBackTo(pathname: string): string | undefined {
  if (pathname.startsWith("/signin")) return "/";
  const hub = getPortalHub(pathname);
  if (!hub) return pathname === "/" ? undefined : "/";
  if (isPortalHub(pathname)) return "/";
  return hub;
}

export function getAutoBackLabel(pathname: string): string {
  if (pathname.startsWith("/signin")) return "Welcome";
  const hub = getPortalHub(pathname);
  if (!hub || isPortalHub(pathname)) return "Welcome";
  if (hub === "/agency") return "Agency home";
  if (hub === "/outlet") return "Outlet home";
  return "PR home";
}
