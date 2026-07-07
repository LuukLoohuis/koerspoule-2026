import posthog from "posthog-js";

const key = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const host = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

export function initPostHog(): void {
  if (!key || !host) return;
  if (posthog.__loaded) return;

  // Cookieless: persistence "memory" schrijft geen cookies én geen localStorage
  // → geen persistente identifiers, dus geen aparte analytics-consent nodig
  // naast de functionele cookiebanner. Bezoeken/events worden gemeten, maar een
  // bezoeker wordt niet over sessies heen herkend. disable_surveys houdt het
  // strikt bij product-analytics.
  posthog.init(key, {
    api_host: host,
    capture_pageview: true,
    capture_pageleave: true,
    person_profiles: "identified_only",
    persistence: "memory",
    disable_surveys: true,
  });
}

export function captureEvent(event: string, properties?: Record<string, unknown>): void {
  if (!posthog.__loaded) return;
  posthog.capture(event, properties);
}

export function identifyUser(distinctId: string, properties?: Record<string, unknown>): void {
  if (!posthog.__loaded || !distinctId) return;
  posthog.identify(distinctId, properties);
}

export function captureException(error: unknown, properties?: Record<string, unknown>): void {
  if (!posthog.__loaded) return;
  posthog.captureException(error, properties);
}

export function getPostHogHeaders(): Record<string, string> {
  if (!posthog.__loaded) return {};

  const sessionId = posthog.get_session_id();
  const distinctId = posthog.get_distinct_id();

  return {
    ...(sessionId ? { "X-POSTHOG-SESSION-ID": sessionId } : {}),
    ...(distinctId ? { "X-POSTHOG-DISTINCT-ID": distinctId } : {}),
  };
}

export default posthog;
