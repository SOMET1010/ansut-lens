import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock supabase BEFORE importing the component
const mockOrder = vi.fn();
const mockLimit = vi.fn();
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: () => ({
        select: () => ({
          order: (..._a: unknown[]) => {
            mockOrder(..._a);
            return {
              limit: (n: number) => {
                mockLimit(n);
                return Promise.resolve({ data: mockData, error: null });
              },
            };
          },
        }),
      }),
      functions: { invoke: vi.fn() },
    },
  };
});

// sonner toast (avoid DOM portal issues)
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import RadarProximiteWidget from "./RadarProximiteWidget";

// Test fixture: 3 projets, ordres similarité ≠ ordre pertinence (fraîcheur + bonus)
let mockData: any[] = [];

const today = new Date();
const daysAgo = (n: number) =>
  new Date(today.getTime() - n * 86400000).toISOString();

const FIXTURE = [
  {
    id: "old-high-sim",
    pays: "Sénégal",
    titre: "Projet ancien haute similarité",
    description: "...",
    similitude_score: 95, // sim haute mais vieux → fortement pénalisé
    date_detection: daysAgo(40), // -30 (plafond)
    source_url: "https://example.sn/projet-ancien",
    recommandation_com: null,
    projet_ansut_equivalent: null,
  },
  {
    id: "fresh-mid-actionable",
    pays: "Ghana",
    titre: "Projet récent actionnable",
    description: "...",
    similitude_score: 70, // sim moyenne, récent + bonus reco + équivalent
    date_detection: daysAgo(1),
    source_url: "https://example.gh/projet-frais",
    recommandation_com: "Communiquer cette semaine",
    projet_ansut_equivalent: "VITIB",
  },
  {
    id: "fresh-low-sim",
    pays: "Kenya",
    titre: "Projet récent faible similarité",
    description: "...",
    similitude_score: 50,
    date_detection: daysAgo(2),
    source_url: "https://example.ke/projet-faible",
    recommandation_com: null,
    projet_ansut_equivalent: null,
  },
];

function renderWidget() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <RadarProximiteWidget />
    </QueryClientProvider>
  );
}

describe("RadarProximiteWidget", () => {
  beforeEach(() => {
    mockData = [...FIXTURE];
    localStorage.clear();
  });

  it("affiche l'encart pédagogique « Pourquoi cet ordre ? »", async () => {
    renderWidget();

    // Attendre la fin du chargement
    await waitFor(() => {
      expect(
        screen.getByText("Projet récent actionnable")
      ).toBeInTheDocument();
    });

    // Le summary du <details> est présent
    const summary = screen.getByText("Pourquoi cet ordre ?");
    expect(summary).toBeInTheDocument();

    // Et le contenu pédagogique est présent dans le DOM
    expect(
      screen.getByText(/pertinence éditoriale/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Pénalité fraîcheur/)).toBeInTheDocument();
    expect(screen.getByText(/Bonus actionnabilité/)).toBeInTheDocument();
  });

  it("trie les projets par pertinence (récent + actionnable avant ancien haute similarité)", async () => {
    renderWidget();

    await waitFor(() => {
      expect(
        screen.getByText("Projet récent actionnable")
      ).toBeInTheDocument();
    });

    // Calcul attendu :
    //   ancien    : 95 - 30 + 0  = 65
    //   récent A. : 70 - 1  + 15 = 84   ← doit être 1er
    //   récent F. : 50 - 2  + 0  = 48
    const titres = screen.getAllByText(/Projet (ancien|récent)/);
    expect(titres[0]).toHaveTextContent("Projet récent actionnable");
    expect(titres[1]).toHaveTextContent("Projet ancien haute similarité");
    expect(titres[2]).toHaveTextContent("Projet récent faible similarité");
  });

  it("affiche le mini-score décomposé pour chaque projet", async () => {
    renderWidget();

    await waitFor(() => {
      expect(
        screen.getByText("Projet récent actionnable")
      ).toBeInTheDocument();
    });

    // Le label "Pertinence" apparaît une fois par projet (3 fois)
    const labels = screen.getAllByText("Pertinence");
    expect(labels).toHaveLength(3);

    // Vérifier la décomposition du projet "récent actionnable" (70 − 1 + 15 = 84)
    const card = screen.getByText("Projet récent actionnable").closest("div.rounded-lg");
    expect(card).toBeTruthy();
    const scoped = within(card as HTMLElement);
    expect(scoped.getByText(/Similarité 70/)).toBeInTheDocument();
    expect(scoped.getByText(/Action \+15/)).toBeInTheDocument();
  });

  it("écarte les projets sans URL source vérifiable", async () => {
    mockData = [
      ...FIXTURE,
      {
        id: "no-source",
        pays: "Maroc",
        titre: "Projet sans source",
        description: "...",
        similitude_score: 99,
        date_detection: daysAgo(0),
        source_url: null,
      },
    ];

    renderWidget();

    await waitFor(() => {
      expect(
        screen.getByText("Projet récent actionnable")
      ).toBeInTheDocument();
    });

    expect(screen.queryByText("Projet sans source")).not.toBeInTheDocument();
    expect(
      screen.getByText(/projet\(s\) masqué\(s\) faute de source vérifiable/i)
    ).toBeInTheDocument();
  });
});
