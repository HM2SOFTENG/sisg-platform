/* ============================================================
   Home Page — Sentinel Sharp v2
   Design: Zero-radius tech brutalism, scan-line hero, sharp cards
   Mobile: Full responsive, stacked sections, touch-friendly CTAs
   Animations: Particle network, staggered reveals, counter roll-up,
               scan lines, data-stream flows, glitch pulses
   ============================================================ */
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Shield, Server, Cloud, ArrowRight, ChevronRight,
  Star, Award, CheckCircle2, Lock, TrendingUp,
  FileCheck, Cpu, Network, Terminal, Zap, Globe,
  Users, DollarSign, Activity
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ParticleNetwork from "@/components/ParticleNetwork";
import AnimatedCounter from "@/components/AnimatedCounter";

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/hspgRzBLruNChMPAw2LvPu/sisg-hero-bg-dbtAksWhkw82WiymmhNuai.webp";
const DASHBOARD_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/hspgRzBLruNChMPAw2LvPu/sisg-dashboard-preview-Qmvsw75uQ79J7mvdPd4Rt5.webp";

const DEFAULT_STATS = [
  { value: 47, suffix: "+", label: "Active Contracts", icon: FileCheck, color: "#0066ff" },
  { value: 120, suffix: "+", label: "Team Members", icon: Users, color: "#00d4ff" },
  { value: 12, suffix: "", label: "Certifications", icon: Award, color: "#00e5a0" },
  { value: 98, suffix: "%", label: "Client Retention", icon: TrendingUp, color: "#ffb800" },
];

const services = [
  {
    icon: Shield, title: "Cybersecurity & Compliance",
    description: "CMMC, NIST 800-171, penetration testing, SOC, RMF, and incident response for federal agencies.",
    tags: ["CMMC L2", "NIST 800-171", "Zero Trust"],
    accentColor: "#0066ff", href: "/services#cybersecurity",
  },
  {
    icon: Cpu, title: "Custom Software Development",
    description: "Full-stack web, APIs, microservices, mobile apps, and legacy system modernization.",
    tags: ["Full-Stack", "Microservices", "Mobile"],
    accentColor: "#00d4ff", href: "/services#software",
  },
  {
    icon: Cloud, title: "Cloud & Infrastructure",
    description: "AWS, Azure, DevSecOps, zero-trust architecture, Kubernetes, and infrastructure-as-code.",
    tags: ["AWS GovCloud", "Azure Gov", "K8s"],
    accentColor: "#8b5cf6", href: "/services#cloud",
  },
  {
    icon: Network, title: "IT Consulting & Program Mgmt",
    description: "Digital transformation, vendor management, portfolio management, and strategic advisory.",
    tags: ["Digital Transformation", "PMO", "Strategy"],
    accentColor: "#00e5a0", href: "/services#consulting",
  },
];

const trustBadges = [
  { label: "SDVOSB", desc: "Service-Disabled Veteran-Owned", icon: Award },
  { label: "SBA 8(a)", desc: "Small Business Administration", icon: FileCheck },
  { label: "ISO 27001", desc: "Information Security Mgmt", icon: Lock },
  { label: "CMMC L2", desc: "Cybersecurity Maturity Model", icon: Shield },
  { label: "FedRAMP", desc: "Federal Risk Authorization", icon: Globe },
];

const clients = [
  "Department of Defense", "Veterans Affairs", "Dept. of Homeland Security",
  "NSA", "US Air Force", "FDA", "USMC", "DISA",
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

function SectionReveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Home() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const [stats, setStats] = useState(DEFAULT_STATS);
  const [teamUtilization, setTeamUtilization] = useState<number | null>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/admin/stats");
        if (response.ok) {
          const data = await response.json();
          if (data.stats && Array.isArray(data.stats)) {
            setStats(data.stats);
          }
          if (data.teamUtilization !== undefined) {
            setTeamUtilization(data.teamUtilization);
          }
          if (data.monthlyRevenue !== undefined) {
            setMonthlyRevenue(data.monthlyRevenue);
          }
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
        // Keep defaults on error
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-[oklch(0.07_0.025_255)] overflow-x-hidden">
      <Navigation />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden">
        {/* BG Image */}
        <motion.div style={{ y: heroY }} className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${HERO_BG})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.07_0.025_255)] via-[oklch(0.07_0.025_255/0.85)] to-[oklch(0.07_0.025_255/0.5)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.07_0.025_255)] via-transparent to-transparent" />
        </motion.div>

        {/* Particle Network */}
        <ParticleNetwork
          className="particle-canvas"
          particleCount={60}
          color="#0066ff"
          connectionDistance={130}
        />

        {/* Grid overlay */}
        <div className="absolute inset-0 grid-pattern opacity-20" />

        {/* Scan line */}
        <div className="scan-overlay" />

        {/* Content */}
        <motion.div style={{ opacity: heroOpacity }} className="relative z-10 w-full pt-24 sm:pt-28 pb-16">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">

              {/* Label */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mb-6"
              >
                <span className="section-label">
                  Veteran-Owned · SDVOSB Certified · Federal IT
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.6 }}
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 leading-[1.05] tracking-tight"
                style={{ fontFamily: 'Sora, sans-serif' }}
              >
                Securing the{" "}
                <span className="gradient-text">Digital Frontier</span>
                {" "}of Federal Government
              </motion.h1>

              {/* Subtext */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="text-gray-300 text-base sm:text-lg leading-relaxed mb-8 max-w-xl"
              >
                SISG delivers mission-critical cybersecurity, cloud infrastructure, and custom software solutions to federal agencies — with the discipline of veterans and the precision of engineers.
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65, duration: 0.5 }}
                className="flex flex-col sm:flex-row gap-3 mb-10"
              >
                <Link href="/contact">
                  <button className="btn-tech py-3 px-6 text-sm w-full sm:w-auto justify-center">
                    Get a Free Assessment
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
                <Link href="/services">
                  <button className="btn-tech-outline py-3 px-6 text-sm w-full sm:w-auto justify-center">
                    <Terminal className="w-4 h-4" />
                    Explore Services
                  </button>
                </Link>
              </motion.div>

              {/* Trust badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="flex flex-wrap gap-2"
              >
                {trustBadges.map((b) => (
                  <span key={b.label} className="badge-info px-2.5 py-1 text-[10px]">{b.label}</span>
                ))}
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[oklch(0.07_0.025_255)] to-transparent" />
      </section>

      {/* ── STATS BAR ────────────────────────────────────── */}
      <section className="relative border-y border-white/8 bg-[oklch(0.085_0.025_255)]">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x lg:divide-white/8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="stat-block flex flex-col gap-1 lg:px-8 first:pl-0"
              >
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                  <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">{stat.label}</span>
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} duration={2000} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ─────────────────────────────────────── */}
      <section className="py-16 sm:py-24 relative">
        <div className="absolute inset-0 hex-bg opacity-30" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative">
          <SectionReveal className="mb-10 sm:mb-14">
            <motion.div variants={fadeUp} className="mb-3">
              <span className="section-label">Core Capabilities</span>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              What We <span className="gradient-text">Deliver</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-400 text-base sm:text-lg max-w-2xl">
              End-to-end technology solutions purpose-built for federal agencies and defense contractors.
            </motion.p>
          </SectionReveal>

          <SectionReveal className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {services.map((svc) => (
              <motion.div key={svc.title} variants={fadeUp}>
                <Link href={svc.href}>
                  <div
                    className="tech-card p-5 sm:p-6 h-full group cursor-pointer"
                    style={{ borderTopColor: svc.accentColor + "40" }}
                  >
                    {/* Top accent bar */}
                    <div className="h-[2px] mb-5 -mx-5 sm:-mx-6 -mt-5 sm:-mt-6" style={{ background: `linear-gradient(90deg, ${svc.accentColor}, transparent)` }} />

                    <div className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                        style={{ background: svc.accentColor + "15", border: `1px solid ${svc.accentColor}30` }}
                      >
                        <svc.icon className="w-5 h-5" style={{ color: svc.accentColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold text-base sm:text-lg mb-2 group-hover:text-[#00d4ff] transition-colors" style={{ fontFamily: 'Sora, sans-serif' }}>
                          {svc.title}
                        </h3>
                        <p className="text-gray-400 text-sm leading-relaxed mb-4">{svc.description}</p>
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {svc.tags.map((tag) => (
                            <span key={tag} className="text-[10px] font-mono px-2 py-0.5 border border-white/10 text-gray-500 uppercase tracking-wider">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: svc.accentColor }}>
                          Learn More <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </SectionReveal>
        </div>
      </section>

      {/* ── DASHBOARD PREVIEW ────────────────────────────── */}
      <section className="py-16 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[oklch(0.085_0.025_255)]" />
        <div className="absolute inset-0 dot-matrix opacity-40" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Text */}
            <SectionReveal>
              <motion.div variants={fadeUp} className="mb-3">
                <span className="section-label">Internal Platform</span>
              </motion.div>
              <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5" style={{ fontFamily: 'Sora, sans-serif' }}>
                Mission Control for Your <span className="gradient-text">Operations</span>
              </motion.h2>
              <motion.p variants={fadeUp} className="text-gray-400 text-base leading-relaxed mb-6">
                Our internal enterprise platform gives your team real-time visibility into contracts, projects, financials, and team utilization — all in one command center.
              </motion.p>
              <motion.div variants={fadeUp} className="space-y-3 mb-8">
                {[
                  "Live KPI dashboards with revenue and pipeline analytics",
                  "Kanban project boards with risk tracking",
                  "Team directory with clearance and utilization data",
                  "Financial hub with P&L charts and contract portfolio",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-[#0066ff]/15 border border-[#0066ff]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-[#0066ff]" />
                    </div>
                    <span className="text-gray-300 text-sm">{item}</span>
                  </div>
                ))}
              </motion.div>
              <motion.div variants={fadeUp}>
                <Link href="/dashboard">
                  <button className="btn-tech py-3 px-6 text-sm">
                    Access Dashboard <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </motion.div>
            </SectionReveal>

            {/* Dashboard Image */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
              className="relative"
            >
              <div className="corner-accent">
                <div className="border border-white/10 overflow-hidden relative">
                  <div className="scan-overlay" />
                  <img
                    src={DASHBOARD_IMG}
                    alt="SISG Dashboard"
                    className="w-full h-auto block"
                    loading="lazy"
                  />
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.085_0.025_255/0.4)] to-transparent pointer-events-none" />
                </div>
              </div>
              {/* Floating stat cards */}
              {teamUtilization !== null && (
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -bottom-4 -left-4 sm:-left-8 glass-card border border-[#0066ff]/30 p-3 sm:p-4 hidden sm:block"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-[#0066ff]/15 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-[#0066ff]" />
                    </div>
                    <div>
                      <div className="text-white font-bold text-lg" style={{ fontFamily: 'Sora, sans-serif' }}>{teamUtilization}%</div>
                      <div className="text-gray-500 text-xs font-mono">Team Utilization</div>
                    </div>
                  </div>
                </motion.div>
              )}
              {monthlyRevenue !== null && (
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute -top-4 -right-4 sm:-right-8 glass-card border border-[#00e5a0]/30 p-3 sm:p-4 hidden sm:block"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-[#00e5a0]/15 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-[#00e5a0]" />
                    </div>
                    <div>
                      <div className="text-white font-bold text-lg" style={{ fontFamily: 'Sora, sans-serif' }}>{monthlyRevenue}</div>
                      <div className="text-gray-500 text-xs font-mono">Monthly Revenue</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CLIENTS ──────────────────────────────────────── */}
      <section className="py-12 sm:py-16 border-y border-white/8">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <span className="text-xs font-mono text-gray-600 tracking-widest uppercase">Trusted By Federal Agencies</span>
          </motion.div>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
            {clients.map((client, i) => (
              <motion.div
                key={client}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="text-gray-600 text-sm font-mono hover:text-gray-400 transition-colors border-l border-white/8 pl-4"
              >
                {client}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0066ff]/10 via-transparent to-[#00d4ff]/5" />
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="scan-overlay" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="section-label mx-auto mb-6 inline-flex">Ready to Secure Your Mission</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5 mt-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              Let's Build Something <span className="gradient-text">Unbreakable</span>
            </h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-xl mx-auto mb-8">
              Schedule a free security assessment and discover how SISG can protect and modernize your federal IT infrastructure.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/contact">
                <button className="btn-tech py-3.5 px-8 text-sm w-full sm:w-auto justify-center">
                  Schedule Assessment <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/services">
                <button className="btn-tech-outline py-3.5 px-8 text-sm w-full sm:w-auto justify-center">
                  <Zap className="w-4 h-4" /> View Capabilities
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
