/* ============================================================
   Navigation — Sentinel Sharp v2
   Design: Zero-radius, tech brutalism, animated mobile drawer
   Features: Scroll-aware transparency, services dropdown,
   blinking cursor label, mobile full-screen menu
   ============================================================ */
import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Menu, X, ChevronDown, ArrowRight,
  Terminal, Cpu, Cloud, Network, Lock
} from "lucide-react";

const serviceItems = [
  { label: "Cybersecurity & Compliance", href: "/services#cybersecurity", icon: Lock, desc: "CMMC, NIST, Zero Trust" },
  { label: "Custom Software Dev", href: "/services#software", icon: Cpu, desc: "Full-stack & microservices" },
  { label: "Cloud & Infrastructure", href: "/services#cloud", icon: Cloud, desc: "AWS, Azure, DevSecOps" },
  { label: "IT Consulting & PM", href: "/services#consulting", icon: Network, desc: "Digital transformation" },
];

const navLinks = [
  { label: "Services", href: "/services", hasDropdown: true },
  { label: "Certifications", href: "/certifications" },
  { label: "Partners", href: "/partners" },
  { label: "Careers", href: "/careers" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [location] = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setServicesOpen(false);
  }, [location]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setServicesOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const isActive = (href: string) => location === href || (href !== "/" && location.startsWith(href));

  return (
    <>
      <motion.header
        initial={{ y: -64 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[oklch(0.07_0.025_255/0.97)] border-b border-white/10 shadow-[0_4px_40px_oklch(0_0_0/0.5)]"
            : "bg-transparent border-b border-transparent"
        }`}
        style={{ backdropFilter: scrolled ? "blur(24px)" : "none" }}
      >
        {/* Top accent line */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-[#0066ff] to-[#00d4ff]" />

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">

            {/* Logo */}
            <Link href="/">
              <div className="flex items-center gap-2.5 group">
                <div className="relative w-8 h-8 bg-[#0066ff] flex items-center justify-center overflow-hidden">
                  <Shield className="w-4.5 h-4.5 text-white relative z-10" />
                  <div className="absolute inset-0 bg-[#00d4ff] translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <Shield className="w-4.5 h-4.5 text-white absolute z-20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </div>
                <div>
                  <div className="text-white font-bold text-base leading-none tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
                    SISG
                  </div>
                  <div className="text-[8px] text-[#00d4ff]/70 tracking-[0.2em] uppercase leading-none mt-0.5 font-mono">
                    SENTINEL GROUP
                  </div>
                </div>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) =>
                link.hasDropdown ? (
                  <div key={link.href} ref={dropdownRef} className="relative">
                    <button
                      onClick={() => setServicesOpen(!servicesOpen)}
                      className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-all duration-200 ${
                        isActive(link.href)
                          ? "text-[#00d4ff]"
                          : "text-gray-400 hover:text-white"
                      }`}
                      style={{ fontFamily: 'Sora, sans-serif' }}
                    >
                      {link.label}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${servicesOpen ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {servicesOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scaleY: 0.95 }}
                          animate={{ opacity: 1, y: 0, scaleY: 1 }}
                          exit={{ opacity: 0, y: 8, scaleY: 0.95 }}
                          transition={{ duration: 0.15 }}
                          style={{ transformOrigin: "top" }}
                          className="absolute top-full left-0 mt-1 w-72 bg-[oklch(0.09_0.025_255)] border border-white/12 shadow-[0_20px_60px_oklch(0_0_0/0.6)] overflow-hidden"
                        >
                          {/* Scan line */}
                          <div className="scan-overlay" />
                          <div className="p-1">
                            {serviceItems.map((item) => (
                              <Link key={item.href} href={item.href}>
                                <div className="flex items-center gap-3 p-3 hover:bg-[#0066ff]/10 transition-colors group border-l-2 border-transparent hover:border-[#0066ff]">
                                  <div className="w-8 h-8 bg-[#0066ff]/10 flex items-center justify-center flex-shrink-0">
                                    <item.icon className="w-4 h-4 text-[#0066ff]" />
                                  </div>
                                  <div>
                                    <div className="text-white text-sm font-medium group-hover:text-[#00d4ff] transition-colors" style={{ fontFamily: 'Sora, sans-serif' }}>
                                      {item.label}
                                    </div>
                                    <div className="text-gray-500 text-xs font-mono">{item.desc}</div>
                                  </div>
                                  <ArrowRight className="w-3.5 h-3.5 text-gray-600 ml-auto group-hover:text-[#00d4ff] group-hover:translate-x-1 transition-all" />
                                </div>
                              </Link>
                            ))}
                          </div>
                          <div className="border-t border-white/8 p-2">
                            <Link href="/services">
                              <div className="flex items-center justify-center gap-2 py-2 text-xs text-[#00d4ff] font-mono tracking-wider uppercase hover:bg-[#00d4ff]/5 transition-colors">
                                <Terminal className="w-3 h-3" />
                                View All Services
                              </div>
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link key={link.href} href={link.href}>
                    <div
                      className={`relative px-3 py-2 text-sm font-medium transition-all duration-200 ${
                        isActive(link.href) ? "text-[#00d4ff]" : "text-gray-400 hover:text-white"
                      }`}
                      style={{ fontFamily: 'Sora, sans-serif' }}
                    >
                      {link.label}
                      {isActive(link.href) && (
                        <motion.div
                          layoutId="nav-indicator"
                          className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0066ff]"
                        />
                      )}
                    </div>
                  </Link>
                )
              )}
            </nav>

            {/* Desktop CTAs */}
            <div className="hidden lg:flex items-center gap-2">
              <Link href="/dashboard">
                <button className="btn-tech-outline text-xs py-2 px-4">
                  <Terminal className="w-3.5 h-3.5" />
                  Dashboard
                </button>
              </Link>
              <Link href="/contact">
                <button className="btn-tech text-xs py-2 px-4">
                  Get Started
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            </div>

            {/* Mobile Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden w-9 h-9 flex items-center justify-center text-gray-300 hover:text-white border border-white/10 hover:border-white/25 transition-all"
            >
              <AnimatePresence mode="wait">
                {mobileOpen ? (
                  <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Menu className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
              className="fixed top-0 right-0 bottom-0 w-[min(320px,100vw)] bg-[oklch(0.08_0.025_255)] border-l border-white/10 z-50 lg:hidden flex flex-col overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/8">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-[#0066ff] flex items-center justify-center">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-bold text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>SISG</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white border border-white/10">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Nav Links */}
              <nav className="flex-1 p-4 space-y-1">
                {/* Services section */}
                <div className="mb-2">
                  <div className="text-[10px] text-gray-600 font-mono tracking-widest uppercase px-2 mb-2">Services</div>
                  {serviceItems.map((item, i) => (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link href={item.href}>
                        <div className="flex items-center gap-3 p-3 hover:bg-white/5 border-l-2 border-transparent hover:border-[#0066ff] transition-all">
                          <item.icon className="w-4 h-4 text-[#0066ff]" />
                          <span className="text-gray-300 text-sm">{item.label}</span>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>

                <div className="section-divider my-3" />

                {/* Other links */}
                <div>
                  <div className="text-[10px] text-gray-600 font-mono tracking-widest uppercase px-2 mb-2">Company</div>
                  {navLinks.filter((l) => !l.hasDropdown).map((link, i) => (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.05 }}
                    >
                      <Link href={link.href}>
                        <div className={`flex items-center justify-between p-3 border-l-2 transition-all ${
                          isActive(link.href)
                            ? "border-[#0066ff] bg-[#0066ff]/8 text-[#00d4ff]"
                            : "border-transparent text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/3"
                        }`}>
                          <span className="text-sm font-medium" style={{ fontFamily: 'Sora, sans-serif' }}>{link.label}</span>
                          <ArrowRight className="w-3.5 h-3.5 opacity-40" />
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </nav>

              {/* Mobile CTAs */}
              <div className="p-4 border-t border-white/8 space-y-2">
                <Link href="/contact">
                  <button className="btn-tech w-full justify-center text-xs py-3">
                    Get Started <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
                <Link href="/dashboard">
                  <button className="btn-tech-outline w-full justify-center text-xs py-3">
                    <Terminal className="w-3.5 h-3.5" /> Dashboard
                  </button>
                </Link>
              </div>

              {/* Bottom status */}
              <div className="p-4 border-t border-white/8">
                <div className="badge-active px-3 py-1.5 text-xs flex items-center gap-2 w-fit">
                  <div className="w-1.5 h-1.5 bg-emerald-400 animate-pulse" />
                  Systems Operational
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
