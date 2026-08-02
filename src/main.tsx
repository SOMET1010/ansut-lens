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

createRoot(document.getElementById("root")!).render(<App />);
