import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import Index from "./pages/Index";
import About from "./pages/About";
import Auth from "./pages/Auth";
import UserDashboard from "./pages/UserDashboard";
import StrategyLab from "./pages/StrategyLab";
import StrategyLibrary from "./pages/StrategyLibrary";
import Watchlist from "./pages/Watchlist";
import AuthCallback from "./pages/AuthCallback";
import Goals from "./pages/Goals";
import Journal from "./pages/Journal";
import StockDetail from "./pages/StockDetail";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Support from "./pages/Support";
import Notifications from "./pages/Notifications";
import Admin from "./pages/Admin";
import Learn from "./pages/Learn";
import PurposeOnboarding from "./components/onboarding/PurposeOnboarding";
import { FinancialVaultProvider } from "./hooks/useFinancialVault";

function BatchRunRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to="/strategy-builder" replace state={{ tab: "batch", batchRunId: id }} />;
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <FinancialVaultProvider>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<About />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth-callback" element={<AuthCallback />} />
          <Route path="/onboarding" element={<PurposeOnboarding />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/strategy-builder" element={<StrategyLab />} />
          <Route path="/strategy-library" element={<StrategyLibrary />} />
          <Route path="/strategy-lab/batch" element={<Navigate to="/strategy-builder" replace state={{ tab: "batch" }} />} />
          <Route path="/strategy-lab/batch/:id" element={<BatchRunRedirect />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/stock/:symbol" element={<StockDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/support" element={<Support />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/admin" element={<Admin />} />
          {/* /strategy-pro retired — unified into the Strategy Lab */}
          <Route path="/strategy-pro" element={<Navigate to="/strategy-builder" replace />} />
          <Route path="/learn" element={<Learn />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </FinancialVaultProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
