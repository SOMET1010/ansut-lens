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
import { ProtectedRoute, AdminRoute } from "@/components/auth";
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
                    <Route path="/radar" element={<RadarPage />} />
                    <Route path="/actualites" element={<ActualitesPage />} />
                    <Route path="/personnalites" element={<PersonnalitesPage />} />
                    <Route path="/dossiers" element={<DossiersPage />} />
                    <Route path="/assistant" element={<AssistantPage />} />
                    <Route path="/alertes" element={<AlertesHistoryPage />} />
                    <Route path="/flux" element={<FluxPage />} />
                    <Route path="/flux/:id" element={<FluxDetailPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    
                    {/* Routes Admin */}
                    <Route element={<AdminRoute />}>
                      <Route path="/admin" element={<AdminPage />} />
                      <Route path="/admin/mots-cles" element={<MotsClesPage />} />
                      <Route path="/admin/import-acteurs" element={<ImportActeursPage />} />
                      <Route path="/admin/users" element={<UsersPage />} />
                      <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
                      <Route path="/admin/cron-jobs" element={<CronJobsPage />} />
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
