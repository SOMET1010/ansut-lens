// Tests for the shared "Fusionner intelligemment" deduplication module.
// Run: deno test --allow-net --allow-env supabase/functions/_shared/dedup-actualites_test.ts
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  consolidateActualites,
  formatConsolidatedForPrompt,
  buildSourcesMap,
  type ActuLike,
} from "./dedup-actualites.ts";

const make = (overrides: Partial<ActuLike>): ActuLike => ({
  titre: "Titre par défaut",
  ...overrides,
});

Deno.test("dedup: same canonical URL → fusionné en 1 groupe", () => {
  const items = [
    make({ titre: "ANSUT déploie la fibre", source_url: "https://abidjan.net/article-1?utm=x", source_nom: "Abidjan.net", importance: 70 }),
    make({ titre: "Article différent", source_url: "https://www.abidjan.net/article-1/", source_nom: "Abidjan.net (mirror)", importance: 60 }),
  ];
  const groups = consolidateActualites(items);
  assertEquals(groups.length, 1);
  assertEquals(groups[0].members.length, 2);
  assertEquals(groups[0].sources.length, 1, "URL canonique identique → 1 seule source");
});

Deno.test("dedup: titres très similaires Jaccard > 0.6 → fusionnés", () => {
  const items = [
    make({ titre: "ANSUT inaugure réseau fibre optique zones rurales Bouaké", source_url: "https://a.com/1", source_nom: "A" }),
    make({ titre: "ANSUT inaugure nouveau réseau fibre optique zones rurales région Bouaké", source_url: "https://b.com/2", source_nom: "B" }),
  ];
  const groups = consolidateActualites(items);
  assertEquals(groups.length, 1, "Titres quasi-identiques fusionnés");
  assertEquals(groups[0].sources.length, 2, "Deux sources distinctes conservées");
});

Deno.test("dedup: titres distincts → groupes séparés", () => {
  const items = [
    make({ titre: "Service Universel inclusion numérique", source_url: "https://a.com/1" }),
    make({ titre: "Cybersécurité routeurs failles CVE", source_url: "https://b.com/2" }),
  ];
  const groups = consolidateActualites(items);
  assertEquals(groups.length, 2);
});

Deno.test("dedup: entités communes + sim modérée → fusion (règle 3)", () => {
  // Titres avec assez de tokens partagés (>0.35 Jaccard) ET 2+ entités communes
  const items = [
    make({
      titre: "Patrick M'Bengue rencontre dirigeants opérateurs télécoms",
      entites_personnes: ["Patrick M'Bengue"],
      entites_entreprises: ["ANSUT", "Orange"],
      source_url: "https://a.com/1",
    }),
    make({
      titre: "Patrick M'Bengue échange avec dirigeants opérateurs",
      entites_personnes: ["Patrick M'Bengue"],
      entites_entreprises: ["ANSUT", "Orange"],
      source_url: "https://b.com/2",
    }),
  ];
  const groups = consolidateActualites(items);
  assertEquals(groups.length, 1, "Tokens partagés + entités communes → fusion");
  assertEquals(groups[0].sources.length, 2);
});

Deno.test("dedup: primary = item le plus riche", () => {
  // Tokens >=4 chars communs : "ansut","fibre","optique","bouake","deploie","zones","rurales"
  const items = [
    make({ titre: "ANSUT déploie fibre optique Bouaké zones rurales", importance: 30, source_url: "https://a.com/1" }),
    make({
      titre: "ANSUT déploie fibre optique Bouaké zones rurales nouvelles",
      importance: 90,
      resume: "Couverture étendue",
      impact_ansut: "Fort impact Service Universel",
      entites_entreprises: ["ANSUT"],
      source_url: "https://b.com/2",
    }),
  ];
  const groups = consolidateActualites(items);
  assertEquals(groups.length, 1);
  assertEquals(groups[0].primary.importance, 90, "Le plus riche est promu primary");
});

Deno.test("formatConsolidatedForPrompt: marque [fusionné ×N] pour groupes", () => {
  const items = [
    make({ titre: "ANSUT fibre Bouaké zones rurales", source_url: "https://a.com/1", source_nom: "A" }),
    make({ titre: "ANSUT fibre Bouaké zones rurales nouveau", source_url: "https://b.com/2", source_nom: "B" }),
  ];
  const groups = consolidateActualites(items);
  const text = formatConsolidatedForPrompt(groups);
  assert(text.includes("[1]"), "Référence [1] présente");
  assert(text.includes("[fusionné ×2]"), "Marqueur de fusion présent");
});

Deno.test("buildSourcesMap: indices uniques et continus", () => {
  const items = [
    make({ titre: "Service Universel A", source_url: "https://a.com/1", source_nom: "A" }),
    make({ titre: "IA réseaux B", source_url: "https://b.com/1", source_nom: "B" }),
    make({ titre: "Souveraineté C", source_url: "https://c.com/1", source_nom: "C" }),
  ];
  const map = buildSourcesMap(consolidateActualites(items));
  assertEquals(map.length, 3);
  assertEquals(new Set(map.map(m => m.index)).size, 3, "Indices uniques");
  assert(map.every(m => m.index >= 1 && m.index <= 3));
});
