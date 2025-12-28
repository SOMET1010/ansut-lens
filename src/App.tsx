import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ViewModeProvider } from "@/contexts/ViewModeContext";
import { AppLayout } from "@/components/layout/AppLayout";
import AuthPage from "@/pages/AuthPage";
import RadarPage from "@/pages/RadarPage";
import ActualitesPage from "@/pages/ActualitesPage";
import MediasPage from "@/pages/MediasPage";
import PersonnalitesPage from "@/pages/PersonnalitesPage";
import AssistantPage from "@/pages/AssistantPage";
import AdminPage from "@/pages/AdminPage";
import MotsClesPage from "@/pages/admin/MotsClesPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <ViewModeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/" element={<Navigate to="/radar" replace />} />
                <Route element={<AppLayout />}>
                  <Route path="/radar" element={<RadarPage />} />
                  <Route path="/actualites" element={<ActualitesPage />} />
                  <Route path="/medias" element={<MediasPage />} />
                  <Route path="/personnalites" element={<PersonnalitesPage />} />
                  <Route path="/assistant" element={<AssistantPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/admin/mots-cles" element={<MotsClesPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ViewModeProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
