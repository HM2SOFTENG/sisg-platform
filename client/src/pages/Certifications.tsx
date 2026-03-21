/* ============================================================
   Certifications Page — Sentinel Sharp v2
   Design: Zero-radius, animated progress bars, badge wall,
   compliance matrix, mobile-first
   ============================================================ */
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "wouter";
import { Shield, Award, ArrowRight, Lock, Globe, FileCheck, Star } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const certifications = [
  {
    id: "sdvosb",
    name: "SDVOSB",
    fullName: "Service-Disabled Veteran-Owned Small Business",
    issuer: "U.S. Department of Veterans Affairs",
    status: "Active",
    year: "2019",
    icon: Award,
    accentColor: "#ffb800",
    description: "Federally verified veteran-owned business status enabling set-aside contract eligibility with federal agencies.",
    significance: "Unlocks exclusive federal contracting opportunities and set-aside programs.",
  },
  {
    id: "sba8a",
    name: "SBA 8(a)",
    fullName: "Small Business Administration 8(a) Program",
    issuer: "U.S. Small Business Administration",
    status: "Active",
    year: "2020",
    icon: FileCheck,
    accentColor: "#00e5a0",
    description: "Business development program for small, disadvantaged businesses providing access to sole-source and set-aside contracts.",
    significance: "Access to $4B+ in annual federal set-aside contracts.",
  },
  {
    id: "cmmc",
    name: "CMMC L2",
    fullName: "Cybersecurity Maturity Model Certification Level 2",
    issuer: "Department of Defense",
    status: "Active",
    year: "2023",
    icon: Shield,
    accentColor: "#0066ff",
    description: "DoD-mandated cybersecurity certification demonstrating implementation of 110 NIST SP 800-171 practices.",
    significance: "Required for DoD contracts handling Controlled Unclassified Information (CUI).",
  },
  {
    id: "iso27001",
    name: "ISO 27001",
    fullName: "Information Security Management System",
    issuer: "International Organization for Standardization",
    status: "Active",
    year: "2022",
    icon: Lock,
    accentColor: "#00d4ff",
    description: "International standard for information security management, demonstrating systematic approach to managing sensitive information.",
    significance: "Gold standard for enterprise information security globally.",
  },
  {
    id: "fedramp",
    name: "FedRAMP Ready",
    fullName: "Federal Risk and Authorization Management Program",
    issuer: "General Services Administration",
    status: "In Progress",
    year: "2025",
    icon: Globe,
    accentColor: "#8b5cf6",
    description: "Standardized approach to security assessment, authorization, and continuous monitoring for cloud products and services.",
    significance: "Enables cloud service delivery to all federal agencies.",
  },
  {
    id: "iso9001",
    name: "ISO 9001",
    fullName: "Quality Management System",
    issuer: "International Organization for Standardization",
    status: "Active",
    year: "2021",
    icon: Star,
    accentColor: "#ff6b35",
    description: "International standard for quality management systems ensuring consistent delivery of high-quality products and services.",
    significance: "Demonstrates commitment to continuous improvement and customer satisfaction.",
  },
];

const complianceFrameworks = [
  { name: "NIST SP 800-171", coverage: 100, color: "#0066ff" },
  { name: "NIST SP 800-53", coverage: 95, color: "#00d4ff" },
  { name: "CMMC Level 2", coverage: 100, color: "#00e5a0" },
  { name: "ISO 27001:2022", coverage: 100, color: "#8b5cf6" },
  { name: "FedRAMP Moderate", coverage: 78, color: "#ffb800" },
  { name: "DISA STIG", coverage: 92, color: "#ff6b35" },
  { name: "CIS Controls v8", coverage: 97, color: "#00d4ff" },
  { name: "SOC 2 Type II", coverage: 88, color: "#0066ff" },
];

const teamCerts = [
  { name: "CISSP", count: 8, color: "#0066ff" },
  { name: "CISM", count: 5, color: "#00d4ff" },
  { name: "PMP", count: 12, color: "#00e5a0" },
  { name: "AWS Solutions Architect", count: 15, color: "#ffb800" },
  { name: "Azure Security Engineer", count: 10, color: "#8b5cf6" },
  { name: "CEH", count: 7, color: "#ff6b35" },
  { name: "CompTIA Security+", count: 22, color: "#0066ff" },
  { name: "CISA", count: 4, color: "#00d4ff" },
];

function ProgressBar({ value, color, delay = 0 }: { value: number; color: string; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="progress-bar">
      <motion.div
        className="progress-bar-fill"
        initial={{ width: 0 }}
        animate={inView ? { width: `${value}%` } : { width: 0 }}
        transition={{ duration: 1.2, delay, ease: "easeOut" }}
        style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)` }}
      />
    </div>
  );
}

export default function Certifications() {
  return (
    <div className="min-h-screen bg-[oklch(0.07_0.025_255)] overflow-x-hidden">
      <Navigation />

      {/* Hero */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="scan-overlay" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-4">
            <span className="section-label">Trust & Compliance</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4"
            style={{ fontFamily: "Sora, sans-serif" }}
          >
            Certifications & <span className="gradient-text">Compliance</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-gray-400 text-base sm:text-lg max-w-2xl"
          >
            Our credentials demonstrate our commitment to security, quality, and federal compliance standards.
          </motion.p>
        </div>
      </section>

      {/* Cert Cards */}
      <section className="pb-16 sm:pb-24">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {certifications.map((cert, i) => (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
              >
                <div className="tech-card p-5 h-full">
                  <div className="h-[2px] mb-5 -mx-5 -mt-5" style={{ background: `linear-gradient(90deg, ${cert.accentColor}, transparent)` }} />
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-11 h-11 flex items-center justify-center"
                      style={{ background: cert.accentColor + "15", border: `1px solid ${cert.accentColor}30` }}
                    >
                      <cert.icon className="w-5 h-5" style={{ color: cert.accentColor }} />
                    </div>
                    <span
                      className="text-[10px] font-mono px-2 py-1 border uppercase tracking-wider"
                      style={
                        cert.status === "Active"
                          ? { color: "#00e5a0", borderColor: "#00e5a030", background: "#00e5a008" }
                          : { color: "#ffb800", borderColor: "#ffb80030", background: "#ffb80008" }
                      }
                    >
                      {cert.status}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono tracking-widest uppercase mb-1" style={{ color: cert.accentColor }}>
                    Since {cert.year}
                  </div>
                  <h3 className="text-white font-bold text-lg mb-1" style={{ fontFamily: "Sora, sans-serif" }}>{cert.name}</h3>
                  <div className="text-gray-500 text-xs mb-3">{cert.fullName}</div>
                  <p className="text-gray-400 text-sm leading-relaxed mb-3">{cert.description}</p>
                  <div className="border-t border-white/8 pt-3">
                    <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wider mb-1">Significance</div>
                    <p className="text-gray-300 text-xs leading-relaxed">{cert.significance}</p>
                  </div>
                  <div className="mt-3 text-[10px] font-mono text-gray-600">Issued by: {cert.issuer}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Coverage */}
      <section className="py-16 sm:py-24 bg-[oklch(0.085_0.025_255)] border-y border-white/8 relative overflow-hidden">
        <div className="absolute inset-0 dot-matrix opacity-40" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
            <div>
              <span className="section-label mb-5 inline-flex">Framework Coverage</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 mt-4" style={{ fontFamily: "Sora, sans-serif" }}>
                Compliance <span className="gradient-text">Matrix</span>
              </h2>
              <div className="space-y-4">
                {complianceFrameworks.map((fw, i) => (
                  <motion.div
                    key={fw.name}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, duration: 0.4 }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-gray-300 text-sm font-mono">{fw.name}</span>
                      <span className="text-xs font-mono font-bold" style={{ color: fw.color }}>{fw.coverage}%</span>
                    </div>
                    <ProgressBar value={fw.coverage} color={fw.color} delay={i * 0.08} />
                  </motion.div>
                ))}
              </div>
            </div>
            <div>
              <span className="section-label mb-5 inline-flex">Team Credentials</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 mt-4" style={{ fontFamily: "Sora, sans-serif" }}>
                Individual <span className="gradient-text">Certifications</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teamCerts.map((cert, i) => (
                  <motion.div
                    key={cert.name}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, duration: 0.4 }}
                    className="tech-card p-3 flex items-center justify-between"
                  >
                    <span className="text-gray-300 text-sm font-mono">{cert.name}</span>
                    <span
                      className="text-xs font-bold px-2 py-0.5 font-mono"
                      style={{ color: cert.color, background: cert.color + "15", border: `1px solid ${cert.color}30` }}
                    >
                      {cert.count}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0066ff]/8 to-transparent" />
        <div className="scan-overlay" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4" style={{ fontFamily: "Sora, sans-serif" }}>
              Need Compliance <span className="gradient-text">Guidance?</span>
            </h2>
            <p className="text-gray-400 text-base max-w-lg mx-auto mb-8">
              Our compliance experts can guide you through CMMC, FedRAMP, and other federal certification requirements.
            </p>
            <Link href="/contact">
              <button className="btn-tech py-3.5 px-8 text-sm">
                Talk to a Compliance Expert <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
