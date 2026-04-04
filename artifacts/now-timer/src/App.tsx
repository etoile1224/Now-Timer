import { Switch, Route, Router as WouterRouter } from "wouter";
import { TimerProvider } from "@/context/TimerContext";
import { NavBar } from "@/components/NavBar";
import { FocusPage } from "@/pages/FocusPage";
import { SettingsPage } from "@/pages/SettingsPage";

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      페이지를 찾을 수 없어요.
    </div>
  );
}

function Router() {
  return (
    <>
      <Switch>
        <Route path="/" component={FocusPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
      <NavBar />
    </>
  );
}

function App() {
  return (
    <TimerProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </TimerProvider>
  );
}

export default App;
