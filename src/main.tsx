/**
 * La police Inter etait declaree dans tailwind.config.ts mais n'etait chargee
 * nulle part : ni import dans index.html, ni dependance locale. L'application
 * s'affichait donc avec la police systeme du poste, differente sous Windows,
 * macOS et Android, ce qui expliquait une part de l'impression de rendu date et
 * l'incoherence d'aspect d'un utilisateur a l'autre.
 *
 * La version variable est auto-hebergee plutot que recuperee depuis Google
 * Fonts, afin de ne pas ajouter de resolution DNS et de requete tierce au
 * chemin critique que la refonte vient precisement d'alleger.
 */
import "@fontsource-variable/inter";

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

/**
 * Récupération des chunks périmés après un redéploiement.
 *
 * Une page déjà ouverte référence les hachages d'assets de l'ancienne version ;
 * après un déploiement, ces fichiers n'existent plus et un import dynamique
 * (page chargée en `lazy`, ex. /publier) échoue avec « Failed to fetch
 * dynamically imported module ». Symptôme observé : /Publier tombait sur
 * l'écran d'erreur alors que rien n'était cassé. On recharge alors la page une
 * seule fois (garde anti-boucle de 10 s) pour récupérer le manifeste à jour.
 */
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  const dernier = Number(sessionStorage.getItem("chunk-reload-ts") || 0);
  if (Date.now() - dernier > 10_000) {
    sessionStorage.setItem("chunk-reload-ts", String(Date.now()));
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
