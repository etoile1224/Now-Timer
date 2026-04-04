import { Switch, Route, Router as WouterRouter } from "wouter";
import { TimerProvider } from "@/context/TimerContext";
import { SocialProvider } from "@/context/SocialContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { NavBar } from "@/components/NavBar";
import { Sidebar } from "@/components/Sidebar";
import { FocusPage } from "@/pages/FocusPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SocialPage, PokeToast, PeerAlertToast } from "@/pages/SocialPage";
import { StatsPage } from "@/pages/StatsPage";
import { LoginPage } from "@/pages/LoginPage";
import { useStatsTracker } from "@/hooks/useStatsTracker";

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      페이지를 찾을 수 없어요.
    </div>
  );
}

function StatsTracker() {
  useStatsTracker();
  return null;
}

function Router() {
  return (
    <>
      <StatsTracker />
      <PokeToast />
      <PeerAlertToast />
      <Sidebar />
      <div className="lg:pl-56">
        <Switch>
          <Route path="/" component={FocusPage} />
          <Route path="/social" component={SocialPage} />
          <Route path="/stats" component={StatsPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route component={NotFound} />
        </Switch>
      </div>
      <NavBar />
    </>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-black text-foreground animate-pulse">NOW!</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <TimerProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <SocialProvider>
          <Router />
        </SocialProvider>
      </WouterRouter>
    </TimerProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
