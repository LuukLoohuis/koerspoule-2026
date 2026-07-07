import { PostHog } from "posthog-node";

const key = process.env.POSTHOG_PROJECT_API_KEY;
const host = process.env.POSTHOG_HOST;

export const posthog =
  key && host
    ? new PostHog(key, {
        host,
        enableExceptionAutocapture: true,
      })
    : null;

export function captureServerEvent(params: {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}): void {
  if (!posthog || !params.distinctId) return;
  posthog.capture(params);
}

export function captureServerException(
  error: unknown,
  distinctId?: string,
  properties?: Record<string, unknown>
): void {
  if (!posthog) return;
  posthog.captureException(error, distinctId, properties);
}
