/* Partners Page — Sentinel Sharp v2 */
import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Shield, Handshake, Globe, Zap, CheckCircle2, Terminal } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const tiers = [
  {
    name: "Strategic Alliance",
    accentColor: "#ffb800",
    description: "Deep integration partnerships with shared go-to-market strategy, co-selling, and joint solution development.",
    benefits: ["Dedicated partner success manager", "Co-branded marketing materials", "Joint proposal development", "Revenue sharing program", "Executive briefings"],
    partners: ["Microsoft", "Amazon Web Services", "Palo Alto Networks", "CrowdStrike"],
  },
  {
    name: "Technology Partner",
    accentColor: "#0066ff",
    description: "Technology integration partnerships enabling combined solution delivery for federal clients.",
    benefits: ["Technical integration support", "Partner portal access", "Co-marketing opportunities", "Training & certification support"],
    partners: ["Splunk", "ServiceNow", "Tenable", "HashiCorp", "Red Hat"],
  },
  {
    name: "Teaming Partner",
    accentColor: "#00d4ff",
    description: "Federal contracting teaming arrangements for prime/sub relationships on specific contract vehicles.",
    benefits: ["Teaming agreement templates", "Proposal collaboration", "Contract vehicle access", "Past performance sharing"],
    partners: ["Booz Allen Hamilton", "SAIC", "Leidos", "Perspecta"],
  },
];

const whyPartner = [
  { icon: Shield, title: "Federal Credibility", desc: "SDVOSB, SBA 8(a), and CMMC L2 certified — open doors to set-aside contracts.", color: "#0066ff" },
  { icon: Globe, title: "Broad Contract Access", desc: "GSA Schedule, CIO-SP3, SEWP V, and agency-specific IDIQs.", color: "#00d4ff" },
  { icon: Zap, title: "Technical Depth", desc: "120+ certified engineers across cybersecurity, cloud, and software.", color: "#00e5a0" },
  { icon: Handshake, title: "Veteran Leadership", desc: "Mission-driven culture with deep understanding of federal operations.", color: "#ffb800" },
];

const steps = [
  { step: "01", title: "Submit Interest", desc: "Complete our partner inquiry form with your company profile and partnership goals." },
  { step: "02", title: "Discovery Call", desc: "30-minute call with our partnerships team to assess alignment and opportunities." },
  { step: "03", title: "Agreement", desc: "Execute a teaming or partnership agreement tailored to your engagement model." },
  { step: "04", title: "Onboarding", desc: "Access partner portal, complete joint training, and begin collaborative pursuit." },
];

export default function Partners() {
  return (
    <div className="min-h-screen bg-[oklch(0.07_0.025_255)] overflow-x-hidden">
      <Navigation />

      {/* Hero */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="scan-overlay" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-4">
            <span className="section-label">Partner Ecosystem</span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }} className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4" style={{ fontFamily: "Sora, sans-serif" }}>
            Grow Together <span className="gradient-text">With SISG</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="text-gray-400 text-base sm:text-lg max-w-2xl">
            Build powerful federal IT solutions with a trusted, certified partner. We offer flexible teaming, technology alliances, and strategic co-selling programs.
          </motion.p>
        </div>
      </section>

      {/* Why Partner */}
      <section className="pb-16 sm:pb-20 relative">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <span className="section-label mb-4 inline-flex">Value Proposition</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-4" style={{ fontFamily: "Sora, sans-serif" }}>
              Why <span className="gradient-text">Partner With Us</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {whyPartner.map((w, i) => (
              <motion.div key={w.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.4 }}>
                <div className="tech-card p-5 h-full">
                  <div className="w-10 h-10 flex items-center justify-center mb-3" style={{ background: w.color + "15", border: `1px solid ${w.color}30` }}>
                    <w.icon className="w-5 h-5" style={{ color: w.color }} />
                  </div>
                  <h3 className="text-white font-bold text-sm mb-2" style={{ fontFamily: "Sora, sans-serif" }}>{w.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{w.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Partner Tiers */}
      <section className="py-16 sm:py-20 bg-[oklch(0.085_0.025_255)] border-y border-white/8 relative overflow-hidden">
        <div className="absolute inset-0 hex-bg opacity-30" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="mb-10">
            <span className="section-label mb-4 inline-flex">Partnership Tiers</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-4" style={{ fontFamily: "Sora, sans-serif" }}>
              Find Your <span className="gradient-text">Partnership Level</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {tiers.map((tier, i) => (
              <motion.div key={tier.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}>
                <div className="tech-card p-6 h-full">
                  <div className="h-[2px] mb-5 -mx-6 -mt-6" style={{ background: `linear-gradient(90deg, ${tier.accentColor}, transparent)` }} />
                  <h3 className="text-white font-bold text-lg mb-2" style={{ fontFamily: "Sora, sans-serif", color: tier.accentColor }}>{tier.name}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-5">{tier.description}</p>
                  <div className="mb-5">
                    <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wider mb-2">Benefits</div>
                    <div className="space-y-1.5">
                      {tier.benefits.map((b) => (
                        <div key={b} className="flex items-start gap-2">
                          <div className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: tier.accentColor + "15" }}>
                            <div className="w-1.5 h-1.5" style={{ background: tier.accentColor }} />
                          </div>
                          <span className="text-gray-300 text-xs">{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-white/8 pt-4">
                    <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wider mb-2">Current Partners</div>
                    <div className="flex flex-wrap gap-1.5">
                      {tier.partners.map((p) => (
                        <span key={p} className="text-[10px] font-mono px-2 py-0.5 border border-white/10 text-gray-500">{p}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Onboarding Steps */}
      <section className="py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-0 dot-matrix opacity-40" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="mb-10 text-center">
            <span className="section-label mx-auto inline-flex mb-4">How It Works</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-4" style={{ fontFamily: "Sora, sans-serif" }}>
              Partner <span className="gradient-text">Onboarding</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((s, i) => (
              <motion.div key={s.step} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.4 }}>
                <div className="tech-card p-5 h-full">
                  <div className="text-[10px] font-mono text-[#0066ff] tracking-widest mb-3">{s.step}</div>
                  <h3 className="text-white font-bold text-sm mb-2" style={{ fontFamily: "Sora, sans-serif" }}>{s.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/contact">
              <button className="btn-tech py-3.5 px-8 text-sm">
                <Terminal className="w-4 h-4" /> Become a Partner <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
