import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    /*
     * Le seuil d'avertissement porte sur les chunks individuels, y compris
     * ceux charges a la demande. La metrique qui compte pour l'experience est
     * le poids du chemin critique, verifie par
     * `scripts/mesurer-chemin-critique.py` avec un budget de 400 kB gzip.
     *
     * `vendor-documents` depasse volontairement ce seuil : il rassemble jsPDF,
     * docx et leurs dependances, et n'est telecharge que lorsque
     * l'utilisateur demande effectivement un export.
     */
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        /**
         * Decoupage manuel des dependances lourdes.
         *
         * Objectif : ne jamais imposer a un utilisateur qui consulte la veille
         * le telechargement des generateurs de documents (jsPDF, docx) ni des
         * librairies de graphiques, qui ne servent que sur quelques ecrans.
         */
        manualChunks(id) {
          /*
           * Le module virtuel `vite/preload-helper` est le premier import de
           * chaque chunk differe. Rollup le rangeait par defaut dans le premier
           * chunk qui l'utilisait, en l'occurrence `vendor-documents`, ce qui
           * placait jsPDF et docx dans le chemin critique. On le maintient donc
           * explicitement dans le chunk d'entree.
           */
          if (
            id.includes("vite/preload-helper") ||
            id.includes("vite/modulepreload") ||
            id.includes("commonjsHelpers")
          ) {
            return "index";
          }

          if (!id.includes("node_modules")) return undefined;

          /*
           * Generation de documents : PDF, Word, archives, telechargement.
           *
           * Les dependances transitives de jsPDF sont explicitement listees.
           * Sans cela, pako, canvg, dompurify et core-js — soit plus de six
           * cents kilooctets a eux quatre — restaient dans le chunk generique
           * et se retrouvaient donc telecharges des le premier ecran, alors
           * qu'ils ne servent qu'a l'export PDF et Word.
           */
          if (
            /[\\/]node_modules[\\/](pako|canvg|dompurify|core-js|core-js-pure|fast-png|iobuffer|svg-pathdata|stackblur-canvas|rgbcolor|fflate|@ungap[\\/]structured-clone)[\\/]/.test(
              id,
            )
          ) {
            return "vendor-documents";
          }

          if (
            id.includes("jspdf") ||
            id.includes("docx") ||
            id.includes("file-saver") ||
            id.includes("jszip") ||
            id.includes("react-to-pdf") ||
            id.includes("html2canvas")
          ) {
            return "vendor-documents";
          }

          // Graphiques et visualisations.
          if (
            id.includes("recharts") ||
            id.includes("d3-") ||
            id.includes("victory") ||
            id.includes("decimal.js") ||
            id.includes("lodash")
          ) {
            return "vendor-charts";
          }

          // Jeu d'icones : volumineux et utilise par tous les ecrans.
          if (id.includes("lucide-react")) {
            return "vendor-icons";
          }

          // Dates uniquement (sans dépendance à React). `sonner` et
          // `next-themes` utilisent des hooks React (dont useLayoutEffect) : les
          // isoler dans un chunk distinct de React pouvait créer un cycle d'ordre
          // de chargement où React est `undefined` au moment de leur évaluation
          // (« Cannot read properties of undefined (reading 'useLayoutEffect') »,
          // page blanche). On les laisse donc à Rollup, qui ordonne correctement.
          if (id.includes("date-fns")) {
            return "vendor-base";
          }

          /*
           * Rendu Markdown (assistant, dossiers, newsletters, formation).
           *
           * La liste est longue car l'ecosysteme unified se compose de
           * nombreux paquets minuscules. Les oublier laissait des dependances
           * partagees dans le chunk generique, ce qui reintroduisait le rendu
           * Markdown dans le chemin critique alors qu'aucun ecran d'entree ne
           * l'utilise.
           */
          if (
            /[\\/]node_modules[\\/](react-markdown|remark|remark-.*|rehype.*|micromark.*|mdast.*|unist.*|hast.*|vfile.*|unified|bail|trough|is-plain-obj|extend|decode-named-character-reference|character-entities.*|property-information|space-separated-tokens|comma-separated-tokens|stringify-entities|zwitch|longest-streak|ccount|escape-string-regexp|markdown-table|devlop|estree-util-is-identifier-name|style-to-js|style-to-object|html-url-attributes|web-namespaces|trim-lines|html-void-elements)[\\/]/.test(
              id,
            )
          ) {
            return "vendor-markdown";
          }

          // Client Supabase et dependances reseau associees.
          if (id.includes("@supabase") || id.includes("realtime-js")) {
            return "vendor-supabase";
          }

          // Glisser-deposer (studio newsletter uniquement).
          if (id.includes("@dnd-kit")) {
            return "vendor-dnd";
          }

          // Primitives d'interface Radix et utilitaires de style.
          if (
            id.includes("@radix-ui") ||
            id.includes("cmdk") ||
            id.includes("vaul") ||
            id.includes("embla-carousel") ||
            id.includes("react-day-picker") ||
            id.includes("input-otp") ||
            id.includes("react-resizable-panels")
          ) {
            return "vendor-ui";
          }

          // Formulaires et validation.
          if (
            id.includes("react-hook-form") ||
            id.includes("@hookform") ||
            id.includes("zod")
          ) {
            return "vendor-forms";
          }

          // Noyau React, routeur et gestion d'etat serveur.
          if (
            id.includes("react-router") ||
            id.includes("@tanstack/react-query") ||
            id.includes("/react-dom/") ||
            id.includes("/react/") ||
            id.includes("scheduler")
          ) {
            return "vendor-react";
          }

          /*
           * Catch-all volontairement neutre : forcer TOUTES les autres
           * dépendances dans un unique chunk `vendor` créait des cycles d'ordre
           * de chargement avec `vendor-react` (React `undefined` → crash
           * useLayoutEffect → page blanche). En renvoyant `undefined`, on laisse
           * Rollup découper et ordonner ces modules correctement vis-à-vis de
           * React. Les gros paquets hors chemin critique sont déjà isolés
           * explicitement plus haut.
           */
          return undefined;
        },
      },
    },
  },
}));
