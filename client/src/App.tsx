import { Suspense, lazy } from "react";
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
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const FormSubmissions = lazy(() => import("./pages/admin/FormSubmissions"));
const ContractBidding = lazy(() => import("./pages/admin/ContractBidding"));
const ContractMonitoring = lazy(() => import("./pages/admin/ContractMonitoring"));
const AIContractGen = lazy(() => import("./pages/admin/AIContractGen"));
const ProjectManagement = lazy(() => import("./pages/admin/ProjectManagement"));
const Financials = lazy(() => import("./pages/admin/Financials"));
const MarketingDashboard = lazy(() => import("./pages/admin/MarketingDashboard"));
const PartnershipAdmin = lazy(() => import("./pages/admin/PartnershipAdmin"));
const ContentManagement = lazy(() => import("./pages/admin/ContentManagement"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const ClawBotCenter = lazy(() => import("./pages/admin/ClawBotCenter"));
const SisgAgents = lazy(() => import("./pages/admin/SisgAgents"));
const CommandPortal = lazy(() => import("./pages/admin/CommandPortal"));
const Messaging = lazy(() => import("./pages/admin/Messaging"));
const UserSettings = lazy(() => import("./pages/UserSettings"));
import UserProfile from "./pages/UserProfile";

function ProtectedDashboard({ component: Component }: { component: React.ComponentType }) {
  return (
    <ProtectedRoute>
      <Component />
    </ProtectedRoute>
  );
}

function DashboardFallback() {
  return (
    <div className="min-h-screen bg-[oklch(0.07_0.025_255)] flex items-center justify-center">
      <div className="text-gray-500 text-xs font-mono">Loading module...</div>
    </div>
  );
}

function LazyProtectedDashboard({ component: Component }: { component: React.ComponentType }) {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <ProtectedDashboard component={Component} />
    </Suspense>
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
      <Route path="/u/:userId" component={UserProfile} />

      {/* Protected Dashboard */}
      <Route path="/dashboard">{() => <LazyProtectedDashboard component={Dashboard} />}</Route>
      <Route path="/dashboard/analytics">{() => <LazyProtectedDashboard component={Analytics} />}</Route>
      <Route path="/dashboard/submissions">{() => <LazyProtectedDashboard component={FormSubmissions} />}</Route>
      <Route path="/dashboard/contracts">{() => <LazyProtectedDashboard component={ContractBidding} />}</Route>
      <Route path="/dashboard/monitoring">{() => <LazyProtectedDashboard component={ContractMonitoring} />}</Route>
      <Route path="/dashboard/contract-gen">{() => <LazyProtectedDashboard component={AIContractGen} />}</Route>
      <Route path="/dashboard/projects">{() => <LazyProtectedDashboard component={ProjectManagement} />}</Route>
      <Route path="/dashboard/team">{() => <LazyProtectedDashboard component={UserManagement} />}</Route>
      <Route path="/dashboard/finance">{() => <LazyProtectedDashboard component={Financials} />}</Route>
      <Route path="/dashboard/marketing">{() => <LazyProtectedDashboard component={MarketingDashboard} />}</Route>
      <Route path="/dashboard/partnerships">{() => <LazyProtectedDashboard component={PartnershipAdmin} />}</Route>
      <Route path="/dashboard/content">{() => <LazyProtectedDashboard component={ContentManagement} />}</Route>
      <Route path="/dashboard/reports">{() => <LazyProtectedDashboard component={Reports} />}</Route>
      <Route path="/dashboard/command">{() => <LazyProtectedDashboard component={CommandPortal} />}</Route>
      <Route path="/dashboard/agents">{() => <LazyProtectedDashboard component={SisgAgents} />}</Route>
      <Route path="/dashboard/clawbot">{() => <LazyProtectedDashboard component={ClawBotCenter} />}</Route>
      <Route path="/dashboard/settings">{() => <LazyProtectedDashboard component={AdminSettings} />}</Route>
      <Route path="/dashboard/messages">{() => <LazyProtectedDashboard component={Messaging} />}</Route>
      <Route path="/dashboard/user-settings">{() => <LazyProtectedDashboard component={UserSettings} />}</Route>

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
