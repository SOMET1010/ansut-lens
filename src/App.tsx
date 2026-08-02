import { lazy, Suspense, useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';
import { ViewModeProvider } from '@/contexts/ViewModeContext';
import { AlertNotificationProvider } from '@/components/notifications';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute, PermissionRoute } from '@/components/auth';
import { RouteSkeleton } from '@/components/common';

/**
 * Toutes les routes sont chargees a la demande.
 *
 * Avant la refonte, les quarante-six pages de l'application etaient importees
 * statiquement ici, ce qui produisait un unique fichier JavaScript de pres de
 * quatre megaoctets telecharge avant le premier pixel utile. Un utilisateur qui
 * voulait simplement lire la veille du matin recuperait aussi les vingt-quatre
 * ecrans d'administration, les generateurs de PDF et de documents Word.
 *
 * Le passage en import differe, combine au decoupage manuel des dependances
 * configure dans `vite.config.ts`, ramene le chargement initial a ce qui est
 * reellement necessaire.
 */

// Routes publiques
const AuthPage = lazy(() => import('@/pages/AuthPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const AccessDeniedPage = lazy(() => import('@/pages/AccessDeniedPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));
/**
 * Page de recette visuelle de la refonte, sans authentification ni acces aux
 * donnees. Elle permet de verifier le rendu des composants du nouveau systeme.
 * Supprimer cette ligne et le fichier associe une fois la refonte validee.
 */
const DemoUxPage = lazy(() => import('@/pages/DemoUxPage'));

// Sections principales
const CeMatinPage = lazy(() => import('@/pages/CeMatinPage'));
const VeillePage = lazy(() => import('@/pages/VeillePage'));
const BalayagePage = lazy(() => import('@/pages/BalayagePage'));
const ActeursInfluencePage = lazy(() => import('@/pages/ActeursInfluencePage'));
const FluxPage = lazy(() => import('@/pages/FluxPage'));
const FluxDetailPage = lazy(() => import('@/pages/FluxDetailPage'));
const CommunicationPage = lazy(() => import('@/pages/CommunicationPage'));
const DossiersPage = lazy(() => import('@/pages/DossiersPage'));
const AssistantPage = lazy(() => import('@/pages/AssistantPage'));
const AlertesHistoryPage = lazy(() => import('@/pages/AlertesHistoryPage'));
const AidePage = lazy(() => import('@/pages/AidePage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));

// Administration
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const TechDocPage = lazy(() => import('@/pages/admin/TechDocPage'));
const FormationPage = lazy(() => import('@/pages/admin/FormationPage'));
const MotsClesPage = lazy(() => import('@/pages/admin/MotsClesPage'));
const ImportActeursPage = lazy(() => import('@/pages/admin/ImportActeursPage'));
const UsersPage = lazy(() => import('@/pages/admin/UsersPage'));
const AuditLogsPage = lazy(() => import('@/pages/admin/AuditLogsPage'));
const RevueConnaissancePage = lazy(() => import('@/pages/admin/RevueConnaissancePage'));
const CronJobsPage = lazy(() => import('@/pages/admin/CronJobsPage'));
const SpdiStatusPage = lazy(() => import('@/pages/admin/SpdiStatusPage'));
const NewslettersPage = lazy(() => import('@/pages/admin/NewslettersPage'));
const DiffusionPage = lazy(() => import('@/pages/admin/DiffusionPage'));
const SourcesPage = lazy(() => import('@/pages/admin/SourcesPage'));
const RolesPage = lazy(() => import('@/pages/admin/RolesPage'));
const MatinalePage = lazy(() => import('@/pages/admin/MatinalePage'));
const FreshnessPage = lazy(() => import('@/pages/admin/FreshnessPage'));
const ScoringPage = lazy(() => import('@/pages/admin/ScoringPage'));
const EvenementsPage = lazy(() => import('@/pages/admin/EvenementsPage'));
const ShadowTrackerPage = lazy(() => import('@/pages/admin/ShadowTrackerPage'));
const CoffreContenuPage = lazy(() => import('@/pages/admin/CoffreContenuPage'));
const VeilleSemantiquePage = lazy(() => import('@/pages/admin/VeilleSemantiquePage'));
const AutoVeillePage = lazy(() => import('@/pages/admin/AutoVeillePage'));
const CredibilitePDFPage = lazy(() => import('@/pages/admin/CredibilitePDFPage'));
const ConnecteursSociauxPage = lazy(() => import('@/pages/admin/ConnecteursSociauxPage'));
const GuideComApiSociauxPage = lazy(() => import('@/pages/admin/GuideComApiSociauxPage'));
const TitrologieAdminPage = lazy(() => import('@/pages/admin/TitrologieAdminPage'));
const PresentationPage = lazy(() => import('@/pages/PresentationPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Evite les rechargements en cascade lors des changements de section.
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * Redirige vers la page de reinitialisation lorsque l'URL porte un jeton de
 * recuperation ou d'invitation dans son fragment.
 */
function HashRedirect({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const hashParams = new URLSearchParams(hash.substring(1));
    const type = hashParams.get('type');

    if ((type === 'recovery' || type === 'invite') && location.pathname !== '/auth/reset-password') {
      navigate(`/auth/reset-password${hash}`, { replace: true });
    }
  }, [navigate, location.pathname]);

  return <>{children}</>;
}

/**
 * Ramene le defilement en haut a chaque changement de route.
 * Sans cela, arriver sur une nouvelle page au milieu du contenu desoriente,
 * particulierement apres un lien depuis un ecran deja defile.
 */
function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  return null;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      {/*
        Le theme clair devient le defaut. La plateforme est consultee en journee
        et ses ecrans servent a produire des documents et des captures pour les
        comites : la lisibilite en clair primait sur l'effet visuel du sombre,
        qui reste disponible et memorise par utilisateur.
      */}
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AuthProvider>
          <ViewModeProvider>
            <AlertNotificationProvider>
              <TooltipProvider delayDuration={200}>
                <Toaster />
                <BrowserRouter>
                  <ScrollToTop />
                  <HashRedirect>
                    <Suspense fallback={<RouteSkeleton />}>
                      <Routes>
                        {/* Routes publiques */}
                        <Route path="/auth" element={<AuthPage />} />
                        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
                        <Route path="/access-denied" element={<AccessDeniedPage />} />
                        <Route path="/demo-ux" element={<DemoUxPage />} />

                        {/*
                          Redirections des anciennes adresses.
                          Les liens deja partages par courriel ou dans des notes
                          doivent continuer de fonctionner apres le renommage
                          des sections.
                        */}
                        <Route path="/" element={<Navigate to="/ce-matin" replace />} />
                        <Route path="/radar" element={<Navigate to="/ce-matin" replace />} />
                        <Route path="/medias" element={<Navigate to="/veille" replace />} />
                        <Route path="/actualites" element={<Navigate to="/veille" replace />} />
                        <Route path="/balayage" element={<Navigate to="/recherche" replace />} />
                        <Route path="/flux" element={<Navigate to="/surveillance" replace />} />
                        <Route path="/dossiers" element={<Navigate to="/publier" replace />} />
                        <Route
                          path="/personnalites"
                          element={<Navigate to="/acteurs?tab=cartographie" replace />}
                        />
                        <Route
                          path="/presence-digitale"
                          element={<Navigate to="/acteurs?tab=spdi" replace />}
                        />
                        <Route
                          path="/spdi-review"
                          element={<Navigate to="/acteurs?tab=revue" replace />}
                        />
                        <Route
                          path="/reseaux-sociaux"
                          element={<Navigate to="/communication?tab=social" replace />}
                        />

                        {/* Routes protegees */}
                        <Route
                          element={
                            <ProtectedRoute>
                              <AppLayout />
                            </ProtectedRoute>
                          }
                        >
                          <Route element={<PermissionRoute permission="view_radar" />}>
                            <Route path="/ce-matin" element={<CeMatinPage />} />
                            <Route path="/veille" element={<VeillePage />} />
                            <Route path="/recherche" element={<BalayagePage />} />
                          </Route>

                          <Route element={<PermissionRoute permission="view_personnalites" />}>
                            <Route path="/acteurs" element={<ActeursInfluencePage />} />
                          </Route>

                          <Route element={<PermissionRoute permission="view_dossiers" />}>
                            <Route path="/publier" element={<DossiersPage />} />
                          </Route>

                          <Route element={<PermissionRoute permission="use_assistant" />}>
                            <Route path="/assistant" element={<AssistantPage />} />
                            <Route path="/communication" element={<CommunicationPage />} />
                          </Route>

                          <Route element={<PermissionRoute permission="receive_alerts" />}>
                            <Route path="/alertes" element={<AlertesHistoryPage />} />
                          </Route>

                          <Route element={<PermissionRoute permission="create_flux" />}>
                            <Route path="/surveillance" element={<FluxPage />} />
                            <Route path="/surveillance/:id" element={<FluxDetailPage />} />
                          </Route>

                          <Route path="/aide" element={<AidePage />} />
                          <Route path="/profile" element={<ProfilePage />} />

                          <Route element={<PermissionRoute permission="access_admin" />}>
                            <Route path="/admin" element={<AdminPage />} />
                            <Route path="/admin/connaissance" element={<RevueConnaissancePage />} />

                            <Route element={<PermissionRoute permission="manage_keywords" />}>
                              <Route path="/admin/mots-cles" element={<MotsClesPage />} />
                              <Route path="/admin/evenements" element={<EvenementsPage />} />
                              <Route
                                path="/admin/veille-semantique"
                                element={<VeilleSemantiquePage />}
                              />
                            </Route>

                            <Route element={<PermissionRoute permission="import_actors" />}>
                              <Route path="/admin/import-acteurs" element={<ImportActeursPage />} />
                            </Route>

                            <Route element={<PermissionRoute permission="manage_users" />}>
                              <Route path="/admin/users" element={<UsersPage />} />
                            </Route>

                            <Route element={<PermissionRoute permission="view_audit_logs" />}>
                              <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
                            </Route>

                            <Route element={<PermissionRoute permission="manage_cron_jobs" />}>
                              <Route path="/admin/cron-jobs" element={<CronJobsPage />} />
                              <Route path="/admin/spdi-status" element={<SpdiStatusPage />} />
                              <Route
                                path="/admin/connecteurs-sociaux"
                                element={<ConnecteursSociauxPage />}
                              />
                              <Route
                                path="/admin/guide-com-api"
                                element={<GuideComApiSociauxPage />}
                              />
                            </Route>

                            <Route element={<PermissionRoute permission="manage_newsletters" />}>
                              <Route path="/admin/newsletters" element={<NewslettersPage />} />
                              <Route path="/admin/diffusion" element={<DiffusionPage />} />
                              <Route path="/admin/matinale" element={<MatinalePage />} />
                              <Route path="/admin/freshness" element={<FreshnessPage />} />
                              <Route path="/admin/scoring" element={<ScoringPage />} />
                              <Route path="/admin/titrologie" element={<TitrologieAdminPage />} />
                              <Route
                                path="/admin/shadow-tracker"
                                element={<ShadowTrackerPage />}
                              />
                              <Route
                                path="/admin/coffre-contenu"
                                element={<CoffreContenuPage />}
                              />
                              <Route path="/admin/auto-veille" element={<AutoVeillePage />} />
                            </Route>

                            <Route element={<PermissionRoute permission="manage_sources" />}>
                              <Route path="/admin/sources" element={<SourcesPage />} />
                            </Route>

                            <Route element={<PermissionRoute permission="manage_roles" />}>
                              <Route path="/admin/roles" element={<RolesPage />} />
                            </Route>

                            <Route path="/admin/presentation" element={<PresentationPage />} />
                            <Route path="/admin/formation" element={<FormationPage />} />
                            <Route path="/admin/documentation" element={<TechDocPage />} />
                            <Route path="/admin/credibilite" element={<CredibilitePDFPage />} />
                          </Route>
                        </Route>

                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </HashRedirect>
                </BrowserRouter>
              </TooltipProvider>
            </AlertNotificationProvider>
          </ViewModeProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
