import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Public pages
import Home from "./pages/Home";
import Services from "./pages/Services";
import Certifications from "./pages/Certifications";
import Careers from "./pages/Careers";
import Contact from "./pages/Contact";
import Partners from "./pages/Partners";
import Pricing from "./pages/Pricing";

// Dashboard pages
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Team from "./pages/Team";
import Finance from "./pages/Finance";
import Analytics from "./pages/Analytics";
import {
  TimeTracking, KnowledgeBase, Reports, Admin,
  SettingsPage, Tasks, CalendarPage
} from "./pages/DashboardPlaceholders";

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Home} />
      <Route path="/services" component={Services} />
      <Route path="/certifications" component={Certifications} />
      <Route path="/careers" component={Careers} />
      <Route path="/contact" component={Contact} />
      <Route path="/partners" component={Partners} />
      <Route path="/pricing" component={Pricing} />

      {/* Dashboard */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/analytics" component={Analytics} />
      <Route path="/dashboard/projects" component={Projects} />
      <Route path="/dashboard/tasks" component={Tasks} />
      <Route path="/dashboard/calendar" component={CalendarPage} />
      <Route path="/dashboard/time" component={TimeTracking} />
      <Route path="/dashboard/team" component={Team} />
      <Route path="/dashboard/knowledge" component={KnowledgeBase} />
      <Route path="/dashboard/finance" component={Finance} />
      <Route path="/dashboard/reports" component={Reports} />
      <Route path="/dashboard/admin" component={Admin} />
      <Route path="/dashboard/settings" component={SettingsPage} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
