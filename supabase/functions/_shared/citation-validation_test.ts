// Tests unitaires de la logique de validation post-génération des citations.
// Réplique les regex utilisés dans generer-briefing et assistant-ia, sans dépendre
// du runtime HTTP des fonctions Edge.
//
// Run: deno test supabase/functions/_shared/citation-validation_test.ts
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// === Réplique de la validation `generer-briefing` ===
function validateBriefing(
  text: string,
  validIndexes: Set<number>,
  validUrls: Set<string>,
): { cleaned: string; invalidCitations: string[]; invalidUrls: string[] } {
  const invalidCitations: string[] = [];
  const invalidUrls: string[] = [];

  let cleaned = text.replace(/\[(\d+)\]/g, (m, n) => {
    const idx = parseInt(n, 10);
    if (!validIndexes.has(idx)) {
      invalidCitations.push(m);
      return "";
    }
    return m;
  });

  cleaned = cleaned.replace(/https?:\/\/[^\s\)\]]+/g, (url) => {
    const stripped = url.replace(/[.,;:!?]+$/, "");
    if (!validUrls.has(stripped)) {
      invalidUrls.push(stripped);
      return "";
    }
    return url;
  });

  return { cleaned: cleaned.replace(/\s{2,}/g, " ").trim(), invalidCitations, invalidUrls };
}

Deno.test("validation briefing: retire citations [N] hallucinées", () => {
  const valid = new Set([1, 2]);
  const { cleaned, invalidCitations } = validateBriefing(
    "ANSUT déploie la fibre [1]. Annonce confirmée [99].",
    valid,
    new Set(),
  );
  assertEquals(invalidCitations, ["[99]"]);
  assert(cleaned.includes("[1]"));
  assert(!cleaned.includes("[99]"));
});

Deno.test("validation briefing: retire URLs hors sourcesMap", () => {
  const validUrls = new Set(["https://abidjan.net/real-article"]);
  const { cleaned, invalidUrls } = validateBriefing(
    "Voir https://abidjan.net/real-article et https://fake-source.com/inventé.",
    new Set(),
    validUrls,
  );
  assertEquals(invalidUrls, ["https://fake-source.com/inventé"]);
  assert(cleaned.includes("https://abidjan.net/real-article"));
});

Deno.test("validation briefing: tout valide → aucun retrait", () => {
  const { invalidCitations, invalidUrls } = validateBriefing(
    "Service Universel renforcé [1] selon https://a.com/x.",
    new Set([1]),
    new Set(["https://a.com/x"]),
  );
  assertEquals(invalidCitations.length, 0);
  assertEquals(invalidUrls.length, 0);
});

// === Réplique de la validation `assistant-ia` ===
function validateAssistant(
  text: string,
  validActuIds: Set<string>,
  validDossierIds: Set<string>,
): { invalid_actu_ids: string[]; invalid_dossier_ids: string[] } {
  const actuRe = /\[\[ACTU:([0-9a-f-]{36})(?:\|[^\]]*)?\]\]/gi;
  const dossierRe = /\[\[DOSSIER:([0-9a-f-]{36})(?:\|[^\]]*)?\]\]/gi;
  const invalid_actu_ids: string[] = [];
  const invalid_dossier_ids: string[] = [];
  let m;
  while ((m = actuRe.exec(text))) {
    if (!validActuIds.has(m[1])) invalid_actu_ids.push(m[1]);
  }
  while ((m = dossierRe.exec(text))) {
    if (!validDossierIds.has(m[1])) invalid_dossier_ids.push(m[1]);
  }
  return { invalid_actu_ids, invalid_dossier_ids };
}

const UUID_VALID = "11111111-2222-3333-4444-555555555555";
const UUID_FAKE = "99999999-9999-9999-9999-999999999999";

Deno.test("validation assistant: détecte ACTU hallucinée", () => {
  const r = validateAssistant(
    `Voir [[ACTU:${UUID_VALID}|titre OK]] et [[ACTU:${UUID_FAKE}|titre inventé]].`,
    new Set([UUID_VALID]),
    new Set(),
  );
  assertEquals(r.invalid_actu_ids, [UUID_FAKE]);
});

Deno.test("validation assistant: détecte DOSSIER halluciné", () => {
  const r = validateAssistant(
    `Réf [[DOSSIER:${UUID_FAKE}]].`,
    new Set(),
    new Set([UUID_VALID]),
  );
  assertEquals(r.invalid_dossier_ids, [UUID_FAKE]);
});

Deno.test("validation assistant: tout valide → 0 alerte", () => {
  const r = validateAssistant(
    `Faits [[ACTU:${UUID_VALID}]] confirmés.`,
    new Set([UUID_VALID]),
    new Set(),
  );
  assertEquals(r.invalid_actu_ids.length, 0);
  assertEquals(r.invalid_dossier_ids.length, 0);
});
