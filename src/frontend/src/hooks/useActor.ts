/**
 * useActor - Safe stub
 *
 * This hook is no longer used. The app uses actorSingleton.ts directly.
 * Kept as a stub to avoid import errors if referenced anywhere.
 */
import type { backendInterface } from "../backend";

export function useActor(): {
  actor: backendInterface | null;
  isFetching: boolean;
} {
  return { actor: null, isFetching: false };
}
