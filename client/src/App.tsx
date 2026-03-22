import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Public pages
import Home from "./pages/Home";
import Services from "./pages/Services";
import Certifications from "./pages/Certifications";
import Careers from "./pages/Careers";
import Contact from "./pages/Contact";
import Partners from "./pages/Partners";
import Pricing from "./pages/Pricing";
import AdminLogin from "./pages/AdminLogin";

// Dashboard pages
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import { Tasks, CalendarPage, TimeTracking, KnowledgeBase } from "./pages/DashboardPlaceholders";
import Reports from "./pages/admin/Reports";

// Admin pages
import FormSubmissions from "./pages/admin/FormSubmissions";
import ContractBidding from "./pages/admin/ContractBidding";
import ContractMonitoring from "./pages/admin/ContractMonitoring";
import AIContractGen from "./pages/admin/AIContractGen";
import ProjectManagement from "./pages/admin/ProjectManagement";
import Financials from "./pages/admin/Financials";
import MarketingDashboard from "./pages/admin/MarketingDashboard";
import PartnershipAdmin from "./pages/admin/PartnershipAdmin";
import ContentManagement from "./pages/admin/ContentManagement";
import UserManagement from "./pages/admin/UserManagement";
import AdminSettings from "./pages/admin/AdminSettings";
import ClawBotCenter from "./pages/admin/ClawBotCenter";
import SisgAgents from "./pages/admin/SisgAgents";
import CommandPortal from "./pages/admin/CommandPortal";

function ProtectedDashboard({ component: Component }: { component: React.ComponentType }) {
  return (
    <ProtectedRoute>
      <Component />
    </ProtectedRoute>
  );
}

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
      <Route path="/admin/login" component={AdminLogin} />

      {/* Protected Dashboard */}
      <Route path="/dashboard">{() => <ProtectedDashboard component={Dashboard} />}</Route>
      <Route path="/dashboard/analytics">{() => <ProtectedDashboard component={Analytics} />}</Route>
      <Route path="/dashboard/submissions">{() => <ProtectedDashboard component={FormSubmissions} />}</Route>
      <Route path="/dashboard/contracts">{() => <ProtectedDashboard component={ContractBidding} />}</Route>
      <Route path="/dashboard/monitoring">{() => <ProtectedDashboard component={ContractMonitoring} />}</Route>
      <Route path="/dashboard/contract-gen">{() => <ProtectedDashboard component={AIContractGen} />}</Route>
      <Route path="/dashboard/projects">{() => <ProtectedDashboard component={ProjectManagement} />}</Route>
      <Route path="/dashboard/team">{() => <ProtectedDashboard component={UserManagement} />}</Route>
      <Route path="/dashboard/finance">{() => <ProtectedDashboard component={Financials} />}</Route>
      <Route path="/dashboard/marketing">{() => <ProtectedDashboard component={MarketingDashboard} />}</Route>
      <Route path="/dashboard/partnerships">{() => <ProtectedDashboard component={PartnershipAdmin} />}</Route>
      <Route path="/dashboard/content">{() => <ProtectedDashboard component={ContentManagement} />}</Route>
      <Route path="/dashboard/tasks">{() => <ProtectedDashboard component={Tasks} />}</Route>
      <Route path="/dashboard/calendar">{() => <ProtectedDashboard component={CalendarPage} />}</Route>
      <Route path="/dashboard/time">{() => <ProtectedDashboard component={TimeTracking} />}</Route>
      <Route path="/dashboard/knowledge">{() => <ProtectedDashboard component={KnowledgeBase} />}</Route>
      <Route path="/dashboard/reports">{() => <ProtectedDashboard component={Reports} />}</Route>
      <Route path="/dashboard/command">{() => <ProtectedDashboard component={CommandPortal} />}</Route>
      <Route path="/dashboard/agents">{() => <ProtectedDashboard component={SisgAgents} />}</Route>
      <Route path="/dashboard/clawbot">{() => <ProtectedDashboard component={ClawBotCenter} />}</Route>
      <Route path="/dashboard/settings">{() => <ProtectedDashboard component={AdminSettings} />}</Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="sentinel">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
