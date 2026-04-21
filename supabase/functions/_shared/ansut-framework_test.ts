// Tests d'intégration : vérifie que les 4 fonctions stratégiques (briefing, assistant,
// matinale, rapport-evenement) embarquent bien le cadre ANSUT et les règles
// anti-hallucination dans leurs prompts système.
//
// Run: deno test --allow-read supabase/functions/_shared/ansut-framework_test.ts
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const FUNCTIONS = [
  { name: "generer-briefing", path: "supabase/functions/generer-briefing/index.ts" },
  { name: "assistant-ia", path: "supabase/functions/assistant-ia/index.ts" },
  { name: "generer-matinale", path: "supabase/functions/generer-matinale/index.ts" },
  { name: "generer-rapport-evenement", path: "supabase/functions/generer-rapport-evenement/index.ts" },
];

// === Cadre ANSUT obligatoire ===
// Chaque prompt doit mentionner les deux piliers : Service Universel + IA / télécoms
const ANSUT_PILLARS = [
  /service\s+universel/i,
  /(IA|intelligence artificielle).*(réseau|télécom|communication)/is,
];

// === Règles anti-hallucination ===
// Au moins une formulation interdisant l'invention de faits OU exigeant "information non disponible"
const ANTI_HALLU_PATTERNS = [
  /(jamais|interdiction|ne\s+pas).*(inventer|invente|hallucin)/is,
  /information\s+non\s+disponible/i,
];

for (const fn of FUNCTIONS) {
  Deno.test(`[${fn.name}] embarque le cadre ANSUT (Service Universel + IA télécom)`, async () => {
    const src = await Deno.readTextFile(fn.path);
    for (const pat of ANSUT_PILLARS) {
      assert(pat.test(src), `Prompt de ${fn.name} doit mentionner ${pat}`);
    }
  });

  Deno.test(`[${fn.name}] applique les règles anti-hallucination`, async () => {
    const src = await Deno.readTextFile(fn.path);
    const matched = ANTI_HALLU_PATTERNS.some(p => p.test(src));
    assert(matched, `Prompt de ${fn.name} doit interdire l'invention OU exiger "information non disponible"`);
  });

  Deno.test(`[${fn.name}] référence ANSUT explicitement`, async () => {
    const src = await Deno.readTextFile(fn.path);
    assert(/ANSUT/.test(src), `Le prompt doit nommer ANSUT`);
  });
}

// === Spécifique briefing & assistant : citations obligatoires ===
Deno.test("[generer-briefing] exige citations [N] et valide les URLs", async () => {
  const src = await Deno.readTextFile("supabase/functions/generer-briefing/index.ts");
  assert(/\[1\]|\[N\]|référence/i.test(src), "Doit demander des citations [N]");
  assert(/sourcesMap/.test(src), "Doit construire un sourcesMap");
  assert(/invalid_citations_removed|invalid_urls_removed/.test(src), "Doit retourner métadonnées de validation");
});

Deno.test("[assistant-ia] valide les citations [[ACTU:id]]", async () => {
  const src = await Deno.readTextFile("supabase/functions/assistant-ia/index.ts");
  assert(/\[\[ACTU:/.test(src), "Doit utiliser [[ACTU:id]]");
  assert(/citation_validation|invalid_actu_ids/.test(src), "Doit signaler citations invalides");
});

// === Spécifique rapport-evenement : sortie JSON structurée ===
Deno.test("[generer-rapport-evenement] structure de sortie ANSUT", async () => {
  const src = await Deno.readTextFile("supabase/functions/generer-rapport-evenement/index.ts");
  const requiredKeys = [
    "impact_service_universel",
    "innovation_ia",
    "recommandations",
  ];
  for (const k of requiredKeys) {
    assert(src.includes(k), `Sortie JSON doit inclure "${k}"`);
  }
});

// === Mode Fusionner intelligemment : 3 fonctions intégrées ===
const SMART_MERGE = ["generer-briefing", "assistant-ia", "generer-matinale"];
for (const fn of SMART_MERGE) {
  Deno.test(`[${fn}] utilise le module dedup-actualites`, async () => {
    const src = await Deno.readTextFile(`supabase/functions/${fn}/index.ts`);
    assert(
      /consolidateActualites|dedup-actualites/.test(src),
      `${fn} doit importer le module de déduplication partagé`,
    );
  });
}
