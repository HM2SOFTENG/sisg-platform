/* DashboardLayout — Sentinel Sharp v2
   Design: Sharp sidebar, mobile drawer, tech-forward dark UI
*/
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  LayoutDashboard, FolderKanban, Users, DollarSign, BarChart3,
  CheckSquare, Calendar, Clock, BookOpen, FileText, Settings,
  Shield, Menu, X, Bell, Search, ChevronRight, Terminal, LogOut,
  Inbox, FileSignature, Activity, Brain, Megaphone, Handshake, PenTool, Bot,
  Sun, Moon, Palette, Zap
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";

type NavSection = { section: string; items: { label: string; href: string; icon: any; color: string }[] };

const navSections: NavSection[] = [
  { section: "Overview", items: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, color: "#0066ff" },
    { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3, color: "#ffb800" },
    { label: "Submissions", href: "/dashboard/submissions", icon: Inbox, color: "#00d4ff" },
  ]},
  { section: "Contracts", items: [
    { label: "Bidding", href: "/dashboard/contracts", icon: FileSignature, color: "#8b5cf6" },
    { label: "Monitoring", href: "/dashboard/monitoring", icon: Activity, color: "#00e5a0" },
    { label: "AI Generator", href: "/dashboard/contract-gen", icon: Brain, color: "#0066ff" },
  ]},
  { section: "Operations", items: [
    { label: "Projects", href: "/dashboard/projects", icon: FolderKanban, color: "#8b5cf6" },
    { label: "Team", href: "/dashboard/team", icon: Users, color: "#00d4ff" },
    { label: "Finance", href: "/dashboard/finance", icon: DollarSign, color: "#00e5a0" },
    { label: "Marketing", href: "/dashboard/marketing", icon: Megaphone, color: "#ff6b35" },
    { label: "Partnerships", href: "/dashboard/partnerships", icon: Handshake, color: "#ffb800" },
  ]},
  { section: "Content", items: [
    { label: "Pages & Posts", href: "/dashboard/content", icon: PenTool, color: "#8b5cf6" },
    { label: "Knowledge Base", href: "/dashboard/knowledge", icon: BookOpen, color: "#00d4ff" },
  ]},
  { section: "System", items: [
    { label: "Command Portal", href: "/dashboard/command", icon: Terminal, color: "#0066ff" },
    { label: "Agents", href: "/dashboard/agents", icon: Zap, color: "#00e5a0" },
    { label: "ClawBot", href: "/dashboard/clawbot", icon: Bot, color: "#8b5cf6" },
    { label: "Reports", href: "/dashboard/reports", icon: FileText, color: "#00e5a0" },
    { label: "Settings", href: "/dashboard/settings", icon: Settings, color: "#6b7280" },
  ]},
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, cycleTheme } = useTheme();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    setLocation("/admin/login");
  };

  const handleThemeChange = () => {
    cycleTheme();
    const nextTheme = theme === "dark" ? "light" : theme === "light" ? "sentinel" : "dark";
    toast.success(`Theme switched to ${nextTheme.charAt(0).toUpperCase() + nextTheme.slice(1)}`);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-[var(--border)]">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#0066ff] flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-[var(--foreground)] font-bold text-sm" style={{ fontFamily: "Sora, sans-serif" }}>SISG</div>
            <div className="text-[10px] font-mono text-[var(--muted-foreground)] uppercase tracking-widest">Enterprise</div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-3">
        {navSections.map((section) => (
          <div key={section.section}>
            <div className="px-3 mb-1">
              <span className="text-[9px] font-mono text-[var(--muted-foreground)] uppercase tracking-[0.2em]">{section.section}</span>
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = location === item.href;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                    <div
                      className={`flex items-center gap-3 px-3 py-2 transition-all group cursor-pointer ${
                        active ? "bg-[#0066ff]/12 border-l-2 border-[#0066ff]" : "border-l-2 border-transparent hover:bg-white/4"
                      }`}
                    >
                      <item.icon
                        className="w-3.5 h-3.5 flex-shrink-0 transition-colors"
                        style={{ color: active ? item.color : "rgba(107,114,128,1)" }}
                      />
                      <span
                        className={`text-[13px] transition-colors ${active ? "text-[var(--foreground)] font-medium" : "text-[var(--muted-foreground)] group-hover:text-gray-300"}`}
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      >
                        {item.label}
                      </span>
                      {active && <ChevronRight className="w-3 h-3 ml-auto" style={{ color: item.color }} />}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--border)] space-y-3">
        {/* Theme Toggle */}
        <motion.button
          onClick={handleThemeChange}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex flex-col items-center gap-2 px-3 py-2.5 hover:bg-white/4 transition-all rounded-md"
        >
          <div className="w-7 h-7 flex items-center justify-center">
            {theme === "light" && <Sun className="w-4 h-4 text-yellow-500" />}
            {theme === "dark" && <Moon className="w-4 h-4 text-indigo-400" />}
            {theme === "sentinel" && <Palette className="w-4 h-4 text-blue-500" />}
          </div>
          <span className="text-[10px] font-mono text-[var(--muted-foreground)] uppercase tracking-wider">
            {theme === "sentinel" ? "Sentinel" : theme === "light" ? "Light" : "Dark"}
          </span>
        </motion.button>

        {/* User Info */}
        <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/4 transition-all cursor-pointer">
          <div className="w-7 h-7 bg-[#0066ff]/20 flex items-center justify-center flex-shrink-0">
            <Terminal className="w-3.5 h-3.5 text-[#0066ff]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[var(--foreground)] text-xs font-medium truncate">Brian Smith</div>
            <div className="text-[var(--muted-foreground)] text-[10px] font-mono truncate">brian@sisg.io</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-7 h-7 flex items-center justify-center hover:bg-red-500/20 transition-colors rounded"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5 text-gray-600 hover:text-red-400 transition-colors flex-shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--background)] flex overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 xl:w-60 bg-[var(--sidebar)] border-r border-[var(--border)] flex-shrink-0 fixed left-0 top-0 h-full z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed left-0 top-0 h-full w-60 bg-[var(--sidebar)] border-r border-[var(--border)] z-50 lg:hidden"
            >
              <div className="absolute top-4 right-4">
                <button onClick={() => setMobileOpen(false)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white border border-white/10 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-56 xl:ml-60">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-[var(--sidebar)]/90 backdrop-blur-sm border-b border-[var(--border)] px-3 sm:px-6 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white border border-white/10 transition-colors"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="relative hidden sm:flex items-center max-w-[10rem] md:max-w-xs w-full flex-shrink-0">
              <Search className="absolute left-3 w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
              <input
                className="w-full bg-[var(--background)] border border-[var(--border)] text-gray-400 text-xs pl-9 pr-3 py-2 focus:outline-none focus:border-[#0066ff]/30 font-mono placeholder:text-gray-700 truncate"
                placeholder="Search..."
              />
            </div>
            {title && (
              <div className="text-[var(--foreground)] font-medium text-xs sm:text-sm sm:hidden truncate flex-1" style={{ fontFamily: "Sora, sans-serif" }}>{title}</div>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white border border-white/8 transition-colors relative flex-shrink-0">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#0066ff]" />
            </button>
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#0066ff]/20 border border-[#0066ff]/30 flex items-center justify-center flex-shrink-0">
              <span className="text-[#0066ff] text-[10px] sm:text-xs font-bold font-mono">BS</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
