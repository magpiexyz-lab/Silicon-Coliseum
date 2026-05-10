"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initPostHog, posthog } from "@/lib/analytics";

const UTM_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const capturedGclid = useRef(false);

  useEffect(() => {
    initPostHog();
  }, []);

  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Capture gclid and UTM params on first landing
  useEffect(() => {
    if (capturedGclid.current || !searchParams) return;

    const gclid = searchParams.get("gclid");
    const utmProps: Record<string, string> = {};

    for (const param of UTM_PARAMS) {
      const val = searchParams.get(param);
      if (val) utmProps[param] = val;
    }

    if (gclid || Object.keys(utmProps).length > 0) {
      // Register as super properties so they attach to every future event
      const campaignProps: Record<string, string> = { ...utmProps };
      if (gclid) campaignProps.gclid = gclid;

      posthog.register(campaignProps);

      // Also persist gclid in sessionStorage for signup attribution
      if (gclid) {
        try { sessionStorage.setItem("gclid", gclid); } catch {}
      }

      capturedGclid.current = true;
    }
  }, [searchParams]);

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname;
      if (searchParams?.toString()) {
        url = url + "?" + searchParams.toString();
      }
      posthog.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}
