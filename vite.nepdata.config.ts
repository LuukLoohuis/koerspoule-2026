/**
 * Vite voor testbanken met nepdata (dev-ploegbouwer.html): dezelfde config als
 * de app, maar @/lib/supabase en @/hooks/useAuth wijzen naar een nepversie in
 * het geheugen (src/dev/nepdata). Zo draaien de echte schermen met hun echte
 * hooks, zonder inlog en zonder productiedata.
 *
 *   npx vite --config vite.nepdata.config.ts --port 3200
 *   → http://localhost:3200/dev-ploegbouwer.html
 */
import { defineConfig, mergeConfig, type ConfigEnv, type UserConfig } from "vite";
import path from "path";
import app from "./vite.config";

export default defineConfig((env: ConfigEnv) =>
  // mergeConfig zet deze aliassen vóór die van de app, dus "@" pakt ze niet eerst.
  mergeConfig((app as (env: ConfigEnv) => UserConfig)(env), {
    resolve: {
      alias: [
        { find: /^@\/lib\/supabase$/, replacement: path.resolve(__dirname, "src/dev/nepdata/supabase.ts") },
        { find: /^@\/hooks\/useAuth$/, replacement: path.resolve(__dirname, "src/dev/nepdata/useAuth.tsx") },
      ],
    },
  }),
);
