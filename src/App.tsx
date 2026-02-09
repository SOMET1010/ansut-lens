import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ViewModeProvider } from "@/contexts/ViewModeContext";
import { AlertNotificationProvider } from "@/components/notifications";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute, PermissionRoute } from "@/components/auth";
import AuthPage from "@/pages/AuthPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import RadarPage from "@/pages/RadarPage";
import ActualitesPage from "@/pages/ActualitesPage";
import PersonnalitesPage from "@/pages/PersonnalitesPage";
import DossiersPage from "@/pages/DossiersPage";
import AssistantPage from "@/pages/AssistantPage";
import AdminPage from "@/pages/AdminPage";
import TechDocPage from "@/pages/admin/TechDocPage";
import FormationPage from "@/pages/admin/FormationPage";
import MotsClesPage from "@/pages/admin/MotsClesPage";
import ImportActeursPage from "@/pages/admin/ImportActeursPage";
import UsersPage from "@/pages/admin/UsersPage";
import AuditLogsPage from "@/pages/admin/AuditLogsPage";
import CronJobsPage from "@/pages/admin/CronJobsPage";
import NewslettersPage from "@/pages/admin/NewslettersPage";
import SourcesPage from "@/pages/admin/SourcesPage";
import RolesPage from "@/pages/admin/RolesPage";
import AlertesHistoryPage from "@/pages/AlertesHistoryPage";
import PresentationPage from "@/pages/PresentationPage";
import ProfilePage from "@/pages/ProfilePage";
import FluxPage from "@/pages/FluxPage";
import FluxDetailPage from "@/pages/FluxDetailPage";
import NotFound from "@/pages/NotFound";
import AccessDeniedPage from "@/pages/AccessDeniedPage";

const queryClient = new QueryClient();

/**
 * Top-level redirect: if the URL contains a recovery/invite hash token
 * and we're NOT already on the reset-password page, redirect there.
 * This replaces the old RecoveryTokenHandler wrapper.
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
      console.log('[HashRedirect] Recovery/invite token detected, redirecting to reset-password');
      navigate(`/auth/reset-password${hash}`, { replace: true });
    }
  }, [navigate, location.pathname]);

  return <>{children}</>;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <AuthProvider>
          <ViewModeProvider>
            <AlertNotificationProvider>
              <TooltipProvider>
                <Toaster />
                <BrowserRouter>
                  <HashRedirect>
                    <Routes>
                      {/* Routes publiques */}
                      <Route path="/auth" element={<AuthPage />} />
                      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
                      <Route path="/access-denied" element={<AccessDeniedPage />} />
                      
                      {/* Redirections */}
                      <Route path="/" element={<Navigate to="/radar" replace />} />
                      <Route path="/medias" element={<Navigate to="/radar" replace />} />
                      <Route path="/presence-digitale" element={<Navigate to="/personnalites" replace />} />
                      
                      {/* Routes protégées */}
                      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                        <Route element={<PermissionRoute permission="view_radar" />}>
                          <Route path="/radar" element={<RadarPage />} />
                        </Route>
                        
                        <Route element={<PermissionRoute permission="view_actualites" />}>
                          <Route path="/actualites" element={<ActualitesPage />} />
                        </Route>
                        
                        <Route element={<PermissionRoute permission="view_personnalites" />}>
                          <Route path="/personnalites" element={<PersonnalitesPage />} />
                        </Route>
                        
                        <Route element={<PermissionRoute permission="view_dossiers" />}>
                          <Route path="/dossiers" element={<DossiersPage />} />
                        </Route>
                        
                        <Route element={<PermissionRoute permission="use_assistant" />}>
                          <Route path="/assistant" element={<AssistantPage />} />
                        </Route>
                        
                        <Route element={<PermissionRoute permission="receive_alerts" />}>
                          <Route path="/alertes" element={<AlertesHistoryPage />} />
                        </Route>
                        
                        <Route element={<PermissionRoute permission="create_flux" />}>
                          <Route path="/flux" element={<FluxPage />} />
                          <Route path="/flux/:id" element={<FluxDetailPage />} />
                        </Route>
                        
                        <Route path="/profile" element={<ProfilePage />} />
                        
                        <Route element={<PermissionRoute permission="access_admin" />}>
                          <Route path="/admin" element={<AdminPage />} />
                          
                          <Route element={<PermissionRoute permission="manage_keywords" />}>
                            <Route path="/admin/mots-cles" element={<MotsClesPage />} />
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
                          </Route>
                          
                          <Route element={<PermissionRoute permission="manage_newsletters" />}>
                            <Route path="/admin/newsletters" element={<NewslettersPage />} />
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
                        </Route>
                      </Route>
                      
                      <Route path="*" element={<NotFound />} />
                    </Routes>
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
