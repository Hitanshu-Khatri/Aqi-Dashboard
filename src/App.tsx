
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthModal from "./AuthModal";
import { useAuth } from "./AuthContext";
const queryClient = new QueryClient();



const SKIP_LOGIN = false; // Set to true to skip login (temporary dev bypass)

const App = () => {
  const { user: realUser, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const user = SKIP_LOGIN ? { uid: 'dev', email: 'dev@local' } : realUser;

  useEffect(() => {
    if (!loading && !user) {
      setShowAuth(true);
    }
    // Listen for custom event to open AuthModal from anywhere
    const handler = () => setShowAuth(true);
    window.addEventListener("open-auth-modal", handler);
    return () => window.removeEventListener("open-auth-modal", handler);
  }, [user, loading]);

  if (loading) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index user={user} />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;