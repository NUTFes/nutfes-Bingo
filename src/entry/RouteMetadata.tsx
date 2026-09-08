import { useEffect } from "react";
import { useLocation } from "react-router";

import { SITE_PAGES } from "@/site-pages";

const normalizePathname = (pathname: string) =>
  pathname === "/" ? pathname : pathname.replace(/\/+$/, "");

export function RouteMetadata() {
  const { pathname } = useLocation();

  useEffect(() => {
    const page = SITE_PAGES.find((candidate) => candidate.path === normalizePathname(pathname));
    if (!page) return;
    document.title = page.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) description.content = page.description;
  }, [pathname]);

  return null;
}
