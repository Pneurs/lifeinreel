import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationScheduler } from "@/components/notifications/NotificationScheduler";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Loader2 } from "lucide-react";

// Lazy load all pages
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Home = lazy(() => import("./pages/Home"));
const JourneyDetail = lazy(() => import("./pages/JourneyDetail"));
const Record = lazy(() => import("./pages/Record"));
const NewJourney = lazy(() => import("./pages/NewJourney"));
const Profile = lazy(() => import("./pages/Profile"));
const Timeline = lazy(() => import("./pages/Timeline"));
const Reels = lazy(() => import("./pages/Reels"));
const Compile = lazy(() => import("./pages/Compile"));
const Paywall = lazy(() => import("./pages/Paywall"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <NotificationScheduler />
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Onboarding />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              {/* Protected routes */}
              <Route path="/home" element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } />
              <Route path="/journey/:id" element={
                <ProtectedRoute>
                  <JourneyDetail />
                </ProtectedRoute>
              } />
              <Route path="/record" element={
                <ProtectedRoute>
                  <Record />
                </ProtectedRoute>
              } />
              <Route path="/new-journey" element={
                <ProtectedRoute>
                  <NewJourney />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/timeline" element={
                <ProtectedRoute>
                  <Timeline />
                </ProtectedRoute>
              } />
              <Route path="/reels" element={
                <ProtectedRoute>
                  <Reels />
                </ProtectedRoute>
              } />
              <Route path="/compile" element={
                <ProtectedRoute>
                  <Compile />
                </ProtectedRoute>
              } />
              <Route path="/paywall" element={
                <ProtectedRoute>
                  <Paywall />
                </ProtectedRoute>
              } />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
