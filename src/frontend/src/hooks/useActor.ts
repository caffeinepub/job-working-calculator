import { useQuery } from "@tanstack/react-query";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";

/**
 * Creates and caches a single anonymous actor for the lifetime of the app.
 * Authentication is currently disabled, so we always use an anonymous actor.
 * The query key never changes, so the actor is created once and reused forever.
 */
export function useActor() {
  const actorQuery = useQuery<backendInterface>({
    queryKey: ["actor-v1"],
    queryFn: () => createActorWithConfig(),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: 5,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  return {
    actor: actorQuery.data ?? null,
    isFetching: actorQuery.isFetching,
  };
}
