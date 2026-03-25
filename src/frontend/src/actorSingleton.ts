import type { backendInterface } from "./backend";
/**
 * Actor Singleton
 *
 * Creates one stable backend actor at module load time.
 * No identity, no auth, no React state -- just a direct ICP connection.
 * All saves and reads go through this single instance.
 */
import { createActorWithConfig } from "./config";

let _actorPromise: Promise<backendInterface> | null = null;

export function getActor(): Promise<backendInterface> {
  if (!_actorPromise) {
    _actorPromise = createActorWithConfig().catch((err) => {
      // Reset on failure so next call retries
      _actorPromise = null;
      throw err;
    });
  }
  return _actorPromise;
}
