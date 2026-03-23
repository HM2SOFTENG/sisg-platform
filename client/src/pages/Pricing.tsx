/* Pricing Page — Sentinel Sharp v2 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Shield, Zap, Globe, Terminal, DollarSign } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const tiers = [
  {
    name: "Starter",
    tagline: "For small contractors",
    accentColor: "#00d4ff",
    price: "Custom",
    description: "Entry-level federal IT support for small businesses and new contractors.",
    features: [
      "CMMC Level 1 Assessment",
      "Basic vulnerability scanning",
      "Up to 5 FTE support",
      "Monthly security report",
      "Email support (48hr SLA)",
    ],
    cta: "Request Quote",
    popular: false,
  },
  {
    name: "Professional",
    tagline: "Most popular",
    accentColor: "#0066ff",
    price: "Custom",
    description: "Full-service federal IT and cybersecurity for growing contractors and agencies.",
    features: [
      "CMMC Level 2 Certification Support",
      "Continuous vulnerability management",
      "Up to 25 FTE support",
      "Dedicated PM and security lead",
      "24/7 SOC monitoring",
      "Cloud migration support",
      "Weekly stakeholder reports",
    ],
    cta: "Get Started",
    popular: true,
  },
  {
    name: "Enterprise",
    tagline: "For large agencies",
    accentColor: "#00e5a0",
    price: "Custom",
    description: "Enterprise-scale federal IT transformation with full program management.",
    features: [
      "CMMC Level 3 Readiness",
      "Full DevSecOps pipeline",
      "Unlimited FTE support",
      "Dedicated CISO advisory",
      "24/7 SOC + IR team",
      "FedRAMP authorization support",
      "Custom SLAs",
      "Executive reporting dashboard",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const contractVehicles = [
  { name: "GSA Schedule 70", desc: "IT products and services", color: "#0066ff" },
  { name: "CIO-SP3", desc: "IT solutions for health", color: "#00d4ff" },
  { name: "SEWP V", desc: "IT commodities and solutions", color: "#8b5cf6" },
  { name: "SDVOSB Set-Aside", desc: "Veteran-owned sole source", color: "#ffb800" },
  { name: "SBA 8(a) Direct", desc: "Sole-source up to $4.5M", color: "#00e5a0" },
  { name: "Agency IDIQs", desc: "Agency-specific vehicles", color: "#ff6b35" },
];

const roiItems = [
  { label: "Avg cost of federal data breach", value: "$9.48M", note: "IBM Cost of Data Breach 2024", color: "#ff3b3b" },
  { label: "SISG annual managed security", value: "~$180K", note: "Professional tier estimate", color: "#0066ff" },
  { label: "Potential ROI", value: "52x", note: "Risk-adjusted return", color: "#00e5a0" },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(true);

  return (
    <div className="min-h-screen bg-[oklch(0.07_0.025_255)] overflow-x-hidden">
      <Navigation />

      {/* Hero */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="scan-overlay" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-4">
            <span className="section-label mx-auto inline-flex">Transparent Pricing</span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }} className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4" style={{ fontFamily: "Sora, sans-serif" }}>
            Investment in <span className="gradient-text">Security</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="text-gray-400 text-base sm:text-lg max-w-xl mx-auto">
            All engagements are custom-scoped. Contact us for a tailored proposal based on your agency size, contract vehicle, and requirements.
          </motion.p>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="pb-16 sm:pb-24">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
            {tiers.map((tier, i) => (
              <motion.div key={tier.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}>
                <div className={`tech-card p-4 sm:p-6 h-full flex flex-col relative ${tier.popular ? "border-[#0066ff]/40" : ""}`}>
                  <div className="h-[3px] mb-4 sm:mb-6 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6" style={{ background: `linear-gradient(90deg, ${tier.accentColor}, transparent)` }} />
                  {tier.popular && (
                    <div className="absolute top-4 right-4 text-[10px] font-mono px-2 py-1 border" style={{ color: "#0066ff", borderColor: "#0066ff30", background: "#0066ff15" }}>
                      Most Popular
                    </div>
                  )}
                  <div className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: tier.accentColor }}>{tier.tagline}</div>
                  <h3 className="text-white font-bold text-2xl mb-1" style={{ fontFamily: "Sora, sans-serif" }}>{tier.name}</h3>
                  <div className="text-white font-bold text-3xl mb-3" style={{ fontFamily: "Sora, sans-serif", color: tier.accentColor }}>{tier.price}</div>
                  <p className="text-gray-400 text-sm leading-relaxed mb-5">{tier.description}</p>
                  <div className="flex-1 space-y-2 mb-6">
                    {tier.features.map((f) => (
                      <div key={f} className="flex items-start gap-2.5">
                        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: tier.accentColor + "15" }}>
                          <div className="w-1.5 h-1.5" style={{ background: tier.accentColor }} />
                        </div>
                        <span className="text-gray-300 text-sm">{f}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/contact">
                    <button className="btn-tech text-xs py-2.5 px-5 w-full justify-center" style={{ background: tier.accentColor }}>
                      {tier.cta} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-16 sm:py-20 bg-[oklch(0.085_0.025_255)] border-y border-white/8 relative overflow-hidden">
        <div className="absolute inset-0 dot-matrix opacity-40" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="mb-8 sm:mb-10">
            <span className="section-label mb-3 sm:mb-4 inline-flex">Business Case</span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mt-3 sm:mt-4" style={{ fontFamily: "Sora, sans-serif" }}>
              The ROI of <span className="gradient-text">Cybersecurity</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 mb-8">
            {roiItems.map((item, i) => (
              <motion.div key={item.label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.4 }}>
                <div className="tech-card p-4 sm:p-6 text-center">
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1.5 sm:mb-2" style={{ fontFamily: "Sora, sans-serif", color: item.color }}>{item.value}</div>
                  <div className="text-white font-medium text-xs sm:text-sm mb-0.5 sm:mb-1" style={{ fontFamily: "Sora, sans-serif" }}>{item.label}</div>
                  <div className="text-gray-600 text-[10px] sm:text-xs font-mono">{item.note}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contract Vehicles */}
      <section className="py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="mb-8 sm:mb-10">
            <span className="section-label mb-3 sm:mb-4 inline-flex">Procurement</span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mt-3 sm:mt-4" style={{ fontFamily: "Sora, sans-serif" }}>
              Contract <span className="gradient-text">Vehicles</span>
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm mt-2 max-w-xl">Multiple procurement pathways to simplify acquisition for federal agencies and prime contractors.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {contractVehicles.map((cv, i) => (
              <motion.div key={cv.name} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.4 }}>
                <div className="tech-card p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                  <div className="w-9 sm:w-10 h-9 sm:h-10 flex items-center justify-center flex-shrink-0" style={{ background: cv.color + "15", border: `1px solid ${cv.color}30` }}>
                    <DollarSign className="w-4 sm:w-5 h-4 sm:h-5" style={{ color: cv.color }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-white font-bold text-xs sm:text-sm truncate" style={{ fontFamily: "Sora, sans-serif" }}>{cv.name}</div>
                    <div className="text-gray-500 text-[10px] sm:text-xs font-mono truncate">{cv.desc}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/contact">
              <button className="btn-tech py-3.5 px-8 text-sm">
                Get a Custom Quote <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
