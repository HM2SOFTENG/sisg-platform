/* ============================================================
   Services Page — Sentinel Sharp v2
   Design: Zero-radius tech brutalism, animated service cards,
   process flow with data-stream connectors, mobile-first
   ============================================================ */
import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "wouter";
import {
  Shield, Cpu, Cloud, Network, ArrowRight, CheckCircle2,
  Terminal, Zap, Server, Code, Globe, Users, TrendingUp,
  ChevronDown, ChevronUp
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const serviceCategories = [
  {
    id: "cybersecurity",
    icon: Shield,
    accentColor: "#0066ff",
    title: "Cybersecurity & Compliance",
    tagline: "Defend. Comply. Prevail.",
    description: "Comprehensive cybersecurity services tailored for federal agencies and defense contractors. From CMMC certification to real-time threat detection.",
    capabilities: [
      "CMMC Level 1–3 Assessment & Certification",
      "NIST 800-171 / 800-53 Implementation",
      "Zero Trust Architecture Design",
      "Penetration Testing & Red Team Ops",
      "Security Operations Center (SOC)",
      "Incident Response & Forensics",
      "Risk Management Framework (RMF)",
      "ATO Package Preparation",
    ],
    tools: ["Splunk", "CrowdStrike", "Tenable", "Qualys", "Palo Alto", "SentinelOne"],
    metrics: { contracts: 18, satisfaction: "98%", duration: "6 mo" },
  },
  {
    id: "software",
    icon: Cpu,
    accentColor: "#00d4ff",
    title: "Custom Software Development",
    tagline: "Build. Modernize. Accelerate.",
    description: "Mission-critical software engineered for reliability, security, and scale. From legacy modernization to cloud-native microservices.",
    capabilities: [
      "Full-Stack Web Application Development",
      "API Design & Microservices Architecture",
      "Legacy System Modernization",
      "Mobile Application Development",
      "Section 508 / WCAG 2.1 Compliance",
      "DevSecOps Pipeline Integration",
      "Data Engineering & Analytics Platforms",
      "AI/ML Integration",
    ],
    tools: ["React", "Node.js", "Python", "Java", "TypeScript", "PostgreSQL", "Redis", "Kubernetes"],
    metrics: { contracts: 14, satisfaction: "97%", duration: "8 mo" },
  },
  {
    id: "cloud",
    icon: Cloud,
    accentColor: "#8b5cf6",
    title: "Cloud & Infrastructure",
    tagline: "Migrate. Optimize. Secure.",
    description: "End-to-end cloud transformation for federal workloads. FedRAMP-authorized environments, IaC automation, and enterprise-grade DevSecOps.",
    capabilities: [
      "AWS GovCloud & Azure Government Migration",
      "FedRAMP Authorization Support",
      "Infrastructure as Code (Terraform, Ansible)",
      "Kubernetes & Container Orchestration",
      "CI/CD Pipeline Design & Implementation",
      "Cloud Cost Optimization",
      "Hybrid Cloud Architecture",
      "Disaster Recovery & Business Continuity",
    ],
    tools: ["AWS", "Azure", "Terraform", "Kubernetes", "Docker", "Ansible", "GitHub Actions", "ArgoCD"],
    metrics: { contracts: 11, satisfaction: "96%", duration: "12 mo" },
  },
  {
    id: "consulting",
    icon: Network,
    accentColor: "#00e5a0",
    title: "IT Consulting & Program Management",
    tagline: "Strategize. Execute. Deliver.",
    description: "Strategic advisory and program execution for complex federal IT initiatives. Proven methodologies, certified PMs, and veteran leadership.",
    capabilities: [
      "Digital Transformation Strategy",
      "IT Portfolio & Program Management",
      "Vendor Management & Procurement",
      "Agile / SAFe Coaching & Implementation",
      "IT Governance & Policy Development",
      "Enterprise Architecture",
      "Change Management",
      "Technology Roadmap Planning",
    ],
    tools: ["Jira", "ServiceNow", "MS Project", "Confluence", "Power BI", "Tableau", "SharePoint", "Teams"],
    metrics: { contracts: 9, satisfaction: "99%", duration: "18 mo" },
  },
];

const processSteps = [
  { step: "01", title: "Discovery", desc: "Deep-dive assessment of your current environment, gaps, and mission objectives.", icon: Terminal },
  { step: "02", title: "Architecture", desc: "Design a tailored solution blueprint aligned with federal standards and your timeline.", icon: Server },
  { step: "03", title: "Execution", desc: "Agile delivery with embedded security, weekly progress reports, and stakeholder alignment.", icon: Code },
  { step: "04", title: "Validation", desc: "Rigorous testing, compliance verification, and ATO/certification support.", icon: CheckCircle2 },
  { step: "05", title: "Sustainment", desc: "Ongoing monitoring, optimization, and continuous improvement post-deployment.", icon: Zap },
];

const caseStudies = [
  {
    title: "DoD Zero Trust Implementation",
    service: "Cybersecurity",
    accentColor: "#0066ff",
    before: "Legacy perimeter-based security with 40+ vulnerabilities",
    after: "Zero trust architecture, 99.8% threat reduction",
    value: "$4.2M",
    duration: "8 months",
  },
  {
    title: "Federal Cloud Migration",
    service: "Cloud & Infrastructure",
    accentColor: "#8b5cf6",
    before: "On-premise infrastructure, 6-hour deployment cycles",
    after: "AWS GovCloud, 15-min deployments, 35% cost reduction",
    value: "$2.8M",
    duration: "12 months",
  },
  {
    title: "Agency Portal Modernization",
    service: "Software Development",
    accentColor: "#00d4ff",
    before: "20-year-old COBOL system, 48-hour processing times",
    after: "Modern React/Node.js platform, real-time processing",
    value: "$6.1M",
    duration: "18 months",
  },
];

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { visible: { transition: { staggerChildren: 0.07 } } };

function ServiceCard({ svc }: { svc: typeof serviceCategories[0] }) {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      id={svc.id}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={stagger}
    >
      <div className="tech-card overflow-visible">
        {/* Color bar */}
        <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${svc.accentColor}, transparent)` }} />

        <div className="p-5 sm:p-8">
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6 mb-6">
            <div
              className="w-12 h-12 flex items-center justify-center flex-shrink-0"
              style={{ background: svc.accentColor + "15", border: `1px solid ${svc.accentColor}30` }}
            >
              <svc.icon className="w-6 h-6" style={{ color: svc.accentColor }} />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-mono tracking-widest uppercase mb-1" style={{ color: svc.accentColor }}>
                {svc.tagline}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                {svc.title}
              </h2>
              <p className="text-gray-400 text-sm sm:text-base leading-relaxed">{svc.description}</p>
            </div>
            {/* Metrics */}
            <div className="flex sm:flex-col gap-4 sm:gap-2 sm:items-end flex-shrink-0">
              {[
                { label: "Contracts", value: svc.metrics.contracts },
                { label: "Satisfaction", value: svc.metrics.satisfaction },
                { label: "Avg Duration", value: svc.metrics.duration },
              ].map((m) => (
                <div key={m.label} className="text-center sm:text-right">
                  <div className="text-white font-bold text-lg leading-none" style={{ fontFamily: 'Sora, sans-serif', color: svc.accentColor }}>{m.value}</div>
                  <div className="text-gray-600 text-[10px] font-mono uppercase tracking-wider">{m.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
            {/* Capabilities */}
            <motion.div variants={fadeUp}>
              <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-4 h-[1px]" style={{ background: svc.accentColor }} />
                Capabilities
              </h3>
              <div className="grid grid-cols-1 gap-1.5">
                {svc.capabilities.slice(0, expanded ? undefined : 4).map((cap) => (
                  <div key={cap} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: svc.accentColor + "15" }}>
                      <div className="w-1.5 h-1.5" style={{ background: svc.accentColor }} />
                    </div>
                    <span className="text-gray-300 text-sm">{cap}</span>
                  </div>
                ))}
                {svc.capabilities.length > 4 && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-1.5 text-xs font-mono mt-1 transition-colors"
                    style={{ color: svc.accentColor }}
                  >
                    {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {expanded ? "Show less" : `+${svc.capabilities.length - 4} more`}
                  </button>
                )}
              </div>
            </motion.div>

            {/* Tools */}
            <motion.div variants={fadeUp}>
              <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-4 h-[1px]" style={{ background: svc.accentColor }} />
                Technologies
              </h3>
              <div className="flex flex-wrap gap-2 mb-5">
                {svc.tools.map((tool) => (
                  <span
                    key={tool}
                    className="text-xs font-mono px-2.5 py-1 border text-gray-400 hover:text-white transition-colors"
                    style={{ borderColor: svc.accentColor + "30", background: svc.accentColor + "08" }}
                  >
                    {tool}
                  </span>
                ))}
              </div>
              <Link href="/contact">
                <button
                  className="btn-tech text-xs py-2.5 px-5"
                  style={{ background: svc.accentColor }}
                >
                  Request Consultation <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Services() {
  return (
    <div className="min-h-screen bg-[oklch(0.07_0.025_255)] overflow-x-hidden">
      <Navigation />

      {/* Hero */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="scan-overlay" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-4">
            <span className="section-label">Service Portfolio</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            Our <span className="gradient-text">Capabilities</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-gray-400 text-base sm:text-lg max-w-2xl mb-8"
          >
            Four core service lines engineered for the unique demands of federal IT — from compliance to cloud to code.
          </motion.p>
          {/* Quick nav */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-wrap gap-2">
            {serviceCategories.map((svc) => (
              <a
                key={svc.id}
                href={`#${svc.id}`}
                className="text-xs font-mono px-3 py-1.5 border border-white/10 text-gray-400 hover:text-white hover:border-white/25 transition-all"
              >
                {svc.title.split(" ")[0]}
              </a>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Service Cards */}
      <section className="pb-16 sm:pb-24">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {serviceCategories.map((svc) => (
            <ServiceCard key={svc.id} svc={svc} />
          ))}
        </div>
      </section>

      {/* Process Flow */}
      <section className="py-16 sm:py-24 bg-[oklch(0.085_0.025_255)] border-y border-white/8 relative overflow-hidden">
        <div className="absolute inset-0 dot-matrix opacity-40" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-10 sm:mb-14">
            <span className="section-label mx-auto inline-flex mb-4">Engagement Model</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
              How We <span className="gradient-text">Operate</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            {processSteps.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="relative"
              >
                <div className="tech-card p-5 h-full">
                  <div className="text-[10px] font-mono text-[#0066ff] tracking-widest mb-3">{step.step}</div>
                  <div className="w-9 h-9 bg-[#0066ff]/10 border border-[#0066ff]/20 flex items-center justify-center mb-3">
                    <step.icon className="w-4 h-4 text-[#0066ff]" />
                  </div>
                  <h3 className="text-white font-bold text-sm mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>{step.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{step.desc}</p>
                </div>
                {i < processSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-[1px] bg-gradient-to-r from-[#0066ff]/50 to-transparent" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Case Studies */}
      <section className="py-16 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="mb-10 sm:mb-14">
            <span className="section-label mb-4 inline-flex">Proven Results</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              Case <span className="gradient-text">Studies</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {caseStudies.map((cs, i) => (
              <motion.div
                key={cs.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <div className="tech-card p-5 h-full">
                  <div className="h-[2px] mb-4 -mx-5 -mt-5" style={{ background: `linear-gradient(90deg, ${cs.accentColor}, transparent)` }} />
                  <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: cs.accentColor }}>{cs.service}</div>
                  <h3 className="text-white font-bold text-base mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>{cs.title}</h3>
                  <div className="space-y-3 mb-4">
                    <div>
                      <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wider mb-1">Before</div>
                      <p className="text-gray-500 text-xs leading-relaxed">{cs.before}</p>
                    </div>
                    <div className="section-divider" />
                    <div>
                      <div className="text-[10px] font-mono text-[#00e5a0] uppercase tracking-wider mb-1">After</div>
                      <p className="text-gray-300 text-xs leading-relaxed">{cs.after}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/8 pt-3 mt-3">
                    <div>
                      <div className="text-white font-bold text-lg" style={{ fontFamily: 'Sora, sans-serif', color: cs.accentColor }}>{cs.value}</div>
                      <div className="text-gray-600 text-[10px] font-mono">Contract Value</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>{cs.duration}</div>
                      <div className="text-gray-600 text-[10px] font-mono">Duration</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 relative overflow-hidden border-t border-white/8">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0066ff]/8 to-transparent" />
        <div className="scan-overlay" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              Ready to Get <span className="gradient-text">Started?</span>
            </h2>
            <p className="text-gray-400 text-base max-w-lg mx-auto mb-8">
              Talk to our team about your specific requirements and get a tailored proposal within 48 hours.
            </p>
            <Link href="/contact">
              <button className="btn-tech py-3.5 px-8 text-sm">
                Request a Proposal <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
