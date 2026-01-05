import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ViewModeProvider } from "@/contexts/ViewModeContext";
import { AlertNotificationProvider } from "@/components/notifications";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute, AdminRoute, PermissionRoute } from "@/components/auth";
import AuthPage from "@/pages/AuthPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import RadarPage from "@/pages/RadarPage";
import ActualitesPage from "@/pages/ActualitesPage";
import PersonnalitesPage from "@/pages/PersonnalitesPage";
import DossiersPage from "@/pages/DossiersPage";
import AssistantPage from "@/pages/AssistantPage";
import AdminPage from "@/pages/AdminPage";
import MotsClesPage from "@/pages/admin/MotsClesPage";
import ImportActeursPage from "@/pages/admin/ImportActeursPage";
import UsersPage from "@/pages/admin/UsersPage";
import AuditLogsPage from "@/pages/admin/AuditLogsPage";
import CronJobsPage from "@/pages/admin/CronJobsPage";
import NewslettersPage from "@/pages/admin/NewslettersPage";
import SourcesPage from "@/pages/admin/SourcesPage";
import RolesPage from "@/pages/admin/RolesPage";
import AlertesHistoryPage from "@/pages/AlertesHistoryPage";
import ProfilePage from "@/pages/ProfilePage";
import FluxPage from "@/pages/FluxPage";
import FluxDetailPage from "@/pages/FluxDetailPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <ViewModeProvider>
          <AlertNotificationProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  {/* Routes publiques */}
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
                  
                  {/* Redirections */}
                  <Route path="/" element={<Navigate to="/radar" replace />} />
                  <Route path="/medias" element={<Navigate to="/radar" replace />} />
                  <Route path="/presence-digitale" element={<Navigate to="/personnalites" replace />} />
                  
                  {/* Routes protégées */}
                  <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                    {/* Routes avec vérification de permission */}
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
                    
                    {/* Profile accessible à tous les utilisateurs connectés */}
                    <Route path="/profile" element={<ProfilePage />} />
                    
                    {/* Routes Admin avec permissions spécifiques */}
                    <Route element={<AdminRoute />}>
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
                    </Route>
                  </Route>
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </AlertNotificationProvider>
        </ViewModeProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
