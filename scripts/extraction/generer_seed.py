#!/usr/bin/env python3
"""Génère, à partir de l'extraction curée du plan (JSON), deux livrables :

  1. un SEED SQL séparé (supabase/seeds/seed_connaissance_plan_ansut.sql), à
     n'exécuter qu'APRÈS revue humaine — tous les éléments y sont en statut
     'a_valider' (rien n'est validé automatiquement) ;
  2. un fichier de REVUE (docs/REVUE-CONNAISSANCE-PLAN-ANSUT.md) listant chaque
     élément, sa preuve (diapositive + texte d'origine) et son statut, plus le
     rapport d'ambiguïtés.

Méthode d'extraction : assistée (lecture du PPTX puis structuration manuelle
tracée dans le JSON). Reproductible : ré-exécuter ce script régénère les sorties.
"""
import json
import os
import re

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.abspath(os.path.join(ICI, "..", ".."))
JSON_IN = os.path.join(ICI, "plan_ansut_2026_2030.json")
SEED_OUT = os.path.join(RACINE, "supabase", "seeds", "seed_connaissance_plan_ansut.sql")
REVUE_OUT = os.path.join(RACINE, "docs", "REVUE-CONNAISSANCE-PLAN-ANSUT.md")

TYPE_LABEL = {
    "mission": "Mission", "axe": "Axe stratégique", "programme": "Programme",
    "projet": "Projet", "objectif": "Objectif", "partenaire": "Partenaire",
    "direction": "Direction",
}

TYPE_LABEL_PLURIEL = {
    "mission": "Missions", "axe": "Axes stratégiques", "programme": "Programmes",
    "projet": "Projets", "objectif": "Objectifs", "partenaire": "Partenaires",
    "direction": "Directions",
}


def sql(v):
    if v is None:
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"


def echeance_date(val):
    if val and re.fullmatch(r"\d{4}", str(val)):
        return f"{val}-12-31"
    return None


def kref(key):
    return f"(SELECT id FROM _kmap WHERE key = {sql(key)})"


def generer_seed(data):
    src = data["source"]
    L = []
    L.append("-- =============================================================================")
    L.append("-- SEED (séparé) — Connaissance institutionnelle : Plan Stratégique ANSUT 2026-2030")
    L.append("--")
    L.append("-- NE PAS EXÉCUTER avant revue de docs/REVUE-CONNAISSANCE-PLAN-ANSUT.md.")
    L.append("-- Tous les éléments sont en statut 'a_valider' (🟡) : aucune validation")
    L.append("-- automatique. La validation humaine se fait ensuite en base (validation =")
    L.append("-- 'valide', validated_by, derniere_validation).")
    L.append("-- Généré par scripts/extraction/generer_seed.py — ne pas éditer à la main.")
    L.append("-- Garde-fou : n'insère rien si la source est déjà présente.")
    L.append("-- =============================================================================")
    L.append("")
    L.append("DO $$")
    L.append("BEGIN")
    L.append(f"  IF EXISTS (SELECT 1 FROM public.institutional_sources WHERE reference = {sql(src['reference'])}) THEN")
    L.append("    RAISE NOTICE 'Seed déjà appliqué (source présente) — abandon.';")
    L.append("    RETURN;")
    L.append("  END IF;")
    L.append("")
    L.append("  CREATE TEMP TABLE _kmap(key text PRIMARY KEY, id uuid) ON COMMIT DROP;")
    L.append("")
    L.append("  -- Source documentaire")
    L.append("  WITH s AS (")
    L.append("    INSERT INTO public.institutional_sources (titre, type, reference, date_document)")
    L.append(f"    VALUES ({sql(src['titre'])}, {sql(src['type'])}, {sql(src['reference'])}, {sql(src['date_document'])})")
    L.append("    RETURNING id)")
    L.append(f"  INSERT INTO _kmap SELECT {sql(src['key'])}, id FROM s;")
    L.append("")

    L.append("  -- Entités stratégiques")
    for i, e in enumerate(data["entities"]):
        L.append("  WITH e AS (")
        L.append("    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)")
        L.append(f"    VALUES ({sql(e['type'])}, {sql(e.get('code'))}, {sql(e['libelle'])}, {sql(e.get('description'))}, "
                 f"{sql(e.get('direction_responsable'))}, 'a_valider', {sql(e.get('note_maturite'))}, {i})")
        L.append("    RETURNING id)")
        L.append(f"  INSERT INTO _kmap SELECT {sql(e['key'])}, id FROM e;")
    L.append("")

    L.append("  -- Indicateurs")
    for n, ind in enumerate(data["indicators"]):
        ind_key = f"ind-{n}"
        ind["_key"] = ind_key
        L.append("  WITH i AS (")
        L.append("    INSERT INTO public.strategic_indicators (entity_id, libelle, valeur_cible, unite, echeance, validation, note)")
        L.append(f"    VALUES ({kref(ind['entity'])}, {sql(ind['libelle'])}, {sql(ind.get('valeur_cible'))}, "
                 f"{sql(ind.get('unite'))}, {sql(echeance_date(ind.get('echeance')))}, 'a_valider', {sql(ind.get('note'))})")
        L.append("    RETURNING id)")
        L.append(f"  INSERT INTO _kmap SELECT {sql(ind_key)}, id FROM i;")
    L.append("")

    L.append("  -- Relations")
    for r in data["relations"]:
        L.append("  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)")
        L.append(f"  VALUES ({kref(r['parent'])}, {kref(r['enfant'])}, {sql(r['type'])}, {sql(r.get('validation', 'a_valider'))});")
    L.append("")

    L.append("  -- Preuves documentaires (entités)")
    for e in data["entities"]:
        if e.get("slide") or e.get("texte"):
            L.append("  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)")
            L.append(f"  VALUES ({kref(src['key'])}, 'entity', {kref(e['key'])}, {sql(e.get('slide'))}, {sql(e.get('texte'))}, 'extraction_assistee', {sql(src['date_document'])});")
    L.append("")
    L.append("  -- Preuves documentaires (indicateurs)")
    for ind in data["indicators"]:
        if ind.get("slide") or ind.get("texte"):
            L.append("  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)")
            L.append(f"  VALUES ({kref(src['key'])}, 'indicator', {kref(ind['_key'])}, {sql(ind.get('slide'))}, {sql(ind.get('texte'))}, 'extraction_assistee', {sql(src['date_document'])});")
    L.append("")
    L.append("  RAISE NOTICE 'Seed connaissance appliqué (statut a_valider). Passez à la revue/validation.';")
    L.append("END $$;")
    L.append("")
    return "\n".join(L)


def generer_revue(data):
    src = data["source"]
    ents = data["entities"]
    by_type = {}
    for e in ents:
        by_type.setdefault(e["type"], []).append(e)

    M = []
    M.append("# Revue — Connaissance institutionnelle : Plan Stratégique ANSUT 2026-2030")
    M.append("")
    M.append("> Fichier de **revue humaine** du seed extrait. **Aucun élément n'est validé.**")
    M.append("> Tout est en statut 🟡 *à valider*. Après lecture et correction, passez chaque")
    M.append("> élément à `valide` (🟢), `suppose` (🟠) ou `rejete` en base.")
    M.append("")
    M.append(f"- **Source** : {src['titre']} (`{src['reference']}`, {src['date_document']})")
    M.append(f"- **Méthode** : extraction assistée (lecture du PPTX + structuration tracée)")
    n_ind = len(data["indicators"])
    M.append(f"- **Volumes** : {len(ents)} entités, {len(data['relations'])} relations, {n_ind} indicateurs")
    M.append("")
    M.append("## À faire lors de la revue")
    M.append("")
    M.append("- [ ] Vérifier chaque libellé et description sur pièce (texte d'origine ci-dessous).")
    M.append("- [ ] Trancher programme vs projet (voir ambiguïtés).")
    M.append("- [ ] Compléter les directions responsables (absentes du document).")
    M.append("- [ ] Confirmer/infirmer les relations `suppose` (partenaires).")
    M.append("- [ ] Marquer les indicateurs incomplets.")
    M.append("- [ ] Passer les éléments confirmés à `valide` (avec qui/quand).")
    M.append("")

    for t in ["mission", "axe", "projet", "objectif", "partenaire", "programme", "direction"]:
        if t not in by_type:
            continue
        M.append(f"## {TYPE_LABEL_PLURIEL.get(t, t)}")
        M.append("")
        for e in by_type[t]:
            code = f"`{e['code']}` " if e.get("code") else ""
            M.append(f"### {code}{e['libelle']}  — 🟡 à valider")
            if e.get("description"):
                M.append(f"- {e['description']}")
            if e.get("note_maturite"):
                M.append(f"- ⚠️ {e['note_maturite']}")
            M.append(f"- Preuve : *{e.get('slide', '—')}* — « {e.get('texte', '—')} »")
            M.append("")

    M.append("## Indicateurs (par objectif)")
    M.append("")
    ent_by_key = {e["key"]: e for e in ents}
    ind_by_entity = {}
    for ind in data["indicators"]:
        ind_by_entity.setdefault(ind["entity"], []).append(ind)
    for ek, inds in ind_by_entity.items():
        libelle = ent_by_key.get(ek, {}).get("libelle", ek)
        M.append(f"### {libelle}")
        M.append("")
        M.append("| Indicateur | Cible | Échéance | Preuve |")
        M.append("|---|---|---|---|")
        for ind in inds:
            M.append(f"| {ind['libelle']} | {ind.get('valeur_cible', '—')} | {ind.get('echeance', '—')} | {ind.get('slide', '—')} |")
        M.append("")

    M.append("## Ambiguïtés & éléments non prouvés")
    M.append("")
    for a in data.get("ambiguites", []):
        M.append(f"- {a}")
    M.append("")
    M.append("## Rappel")
    M.append("")
    M.append("Aucun élément extrait automatiquement n'apparaît comme **validé** sans revue")
    M.append("humaine. Tant que la revue n'est pas faite, ne pas brancher cette base sur")
    M.append("« Ce matin ».")
    M.append("")
    return "\n".join(M)


def main():
    with open(JSON_IN, encoding="utf-8") as f:
        data = json.load(f)
    os.makedirs(os.path.dirname(SEED_OUT), exist_ok=True)
    os.makedirs(os.path.dirname(REVUE_OUT), exist_ok=True)
    with open(SEED_OUT, "w", encoding="utf-8") as f:
        f.write(generer_seed(data))
    with open(REVUE_OUT, "w", encoding="utf-8") as f:
        f.write(generer_revue(data))
    print(f"Seed  : {SEED_OUT}")
    print(f"Revue : {REVUE_OUT}")


if __name__ == "__main__":
    main()
