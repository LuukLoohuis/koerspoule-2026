import { lazy, type ComponentType } from "react";

/**
 * lazyWithRetry — net als React.lazy, maar vangt de "Failed to fetch dynamically
 * imported module"-fout op die optreedt na een nieuwe deploy: de geopende pagina
 * verwijst dan nog naar een oude chunk-hash die niet meer op de server staat.
 *
 * Bij zo'n fout verversen we de pagina één keer (vlag in sessionStorage tegen een
 * reload-loop) zodat de browser de nieuwe index.html + chunk-hashes ophaalt. Lukt
 * het na de reload alsnog niet, dan gooien we door naar de ErrorBoundary.
 */
const RELOAD_FLAG = "kp_chunk_reloaded";

function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /dynamically imported module|Importing a module script failed|Failed to fetch|ChunkLoadError|error loading dynamically imported module/i.test(
      msg,
    )
  );
}

export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      const mod = await factory();
      // Geslaagd → vlag wissen zodat een toekomstige deploy opnieuw mag verversen.
      try {
        sessionStorage.removeItem(RELOAD_FLAG);
      } catch {
        /* negeer */
      }
      return mod;
    } catch (err) {
      if (isChunkLoadError(err)) {
        let alreadyReloaded = false;
        try {
          alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === "1";
          if (!alreadyReloaded) sessionStorage.setItem(RELOAD_FLAG, "1");
        } catch {
          /* sessionStorage geblokkeerd → toch proberen te verversen */
        }
        if (!alreadyReloaded) {
          window.location.reload();
          // Hang tot de reload het overneemt (geen flits van de ErrorBoundary).
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw err;
    }
  });
}
