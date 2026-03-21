/* Contact Page — Sentinel Sharp v2 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, MapPin, Phone, ArrowRight, Terminal, Shield, Clock, ChevronDown, ChevronUp } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { toast } from "sonner";

const contactTypes = [
  { id: "general", label: "General Inquiry", color: "#0066ff" },
  { id: "cybersecurity", label: "Cybersecurity", color: "#00d4ff" },
  { id: "cloud", label: "Cloud & Infrastructure", color: "#8b5cf6" },
  { id: "software", label: "Software Development", color: "#00e5a0" },
  { id: "partnership", label: "Partnership", color: "#ffb800" },
  { id: "careers", label: "Careers", color: "#ff6b35" },
];

const faqs = [
  { q: "How quickly can SISG respond to a cybersecurity incident?", a: "Our SOC team provides 24/7 monitoring with a 1-hour initial response SLA for critical incidents. We maintain an on-call incident response team for immediate deployment." },
  { q: "Do you work with small federal agencies and contractors?", a: "Yes. As an SBA 8(a) and SDVOSB firm, we specialize in supporting small to mid-sized federal agencies and prime/sub-contractors at all contract vehicle levels." },
  { q: "What contract vehicles does SISG hold?", a: "We hold GSA Schedule, CIO-SP3, SEWP V, and multiple agency-specific IDIQs. We can also support sole-source awards through our SDVOSB and 8(a) status." },
  { q: "Can SISG sponsor security clearances?", a: "Yes. We actively sponsor Public Trust, Secret, and Top Secret clearances for qualifying positions. Clearance sponsorship timelines vary by level." },
  { q: "What is your typical project engagement timeline?", a: "Discovery and proposal typically take 1–2 weeks. Project kickoff follows within 30 days of contract award. We operate in 2-week Agile sprints with weekly stakeholder updates." },
];

export default function Contact() {
  const [selectedType, setSelectedType] = useState("general");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", email: "", org: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitting(false);
    toast.success("Message sent! We\'ll respond within 24 hours.");
    setForm({ name: "", email: "", org: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-[oklch(0.07_0.025_255)] overflow-x-hidden">
      <Navigation />

      {/* Hero */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="scan-overlay" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-4">
            <span className="section-label">Get In Touch</span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }} className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4" style={{ fontFamily: "Sora, sans-serif" }}>
            Start a <span className="gradient-text">Conversation</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="text-gray-400 text-base sm:text-lg max-w-2xl">
            Whether you need a security assessment, a cloud migration, or a strategic partner — we're ready to help.
          </motion.p>
        </div>
      </section>

      {/* Main Grid */}
      <section className="pb-16 sm:pb-24">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="tech-card p-6 sm:p-8">
                <div className="h-[2px] mb-6 -mx-6 sm:-mx-8 -mt-6 sm:-mt-8 bg-gradient-to-r from-[#0066ff] to-transparent" />
                <h2 className="text-xl font-bold text-white mb-5" style={{ fontFamily: "Sora, sans-serif" }}>Send a Message</h2>

                {/* Type selector */}
                <div className="mb-6">
                  <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wider mb-2">Inquiry Type</div>
                  <div className="flex flex-wrap gap-2">
                    {contactTypes.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedType(t.id)}
                        className="text-xs font-mono px-3 py-1.5 border transition-all"
                        style={
                          selectedType === t.id
                            ? { borderColor: t.color, background: t.color + "15", color: t.color }
                            : { borderColor: "rgba(255,255,255,0.1)", color: "rgba(156,163,175,1)" }
                        }
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-mono text-gray-600 uppercase tracking-wider block mb-1.5">Full Name *</label>
                      <input
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full bg-[oklch(0.085_0.025_255)] border border-white/10 text-white text-sm px-3 py-2.5 focus:outline-none focus:border-[#0066ff]/50 transition-colors font-mono placeholder:text-gray-700"
                        placeholder="John Smith"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-gray-600 uppercase tracking-wider block mb-1.5">Email Address *</label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full bg-[oklch(0.085_0.025_255)] border border-white/10 text-white text-sm px-3 py-2.5 focus:outline-none focus:border-[#0066ff]/50 transition-colors font-mono placeholder:text-gray-700"
                        placeholder="john@agency.gov"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-wider block mb-1.5">Organization</label>
                    <input
                      value={form.org}
                      onChange={(e) => setForm({ ...form, org: e.target.value })}
                      className="w-full bg-[oklch(0.085_0.025_255)] border border-white/10 text-white text-sm px-3 py-2.5 focus:outline-none focus:border-[#0066ff]/50 transition-colors font-mono placeholder:text-gray-700"
                      placeholder="Department of Defense"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-wider block mb-1.5">Message *</label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full bg-[oklch(0.085_0.025_255)] border border-white/10 text-white text-sm px-3 py-2.5 focus:outline-none focus:border-[#0066ff]/50 transition-colors font-mono placeholder:text-gray-700 resize-none"
                      placeholder="Describe your project or inquiry..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-tech py-3 px-6 text-sm w-full sm:w-auto justify-center disabled:opacity-50"
                  >
                    {submitting ? (
                      <><Terminal className="w-4 h-4 animate-spin" /> Sending...</>
                    ) : (
                      <>Send Message <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* Contact Info */}
              <div className="tech-card p-5">
                <div className="h-[2px] mb-5 -mx-5 -mt-5 bg-gradient-to-r from-[#0066ff] to-transparent" />
                <h3 className="text-white font-bold text-sm mb-4" style={{ fontFamily: "Sora, sans-serif" }}>Direct Contact</h3>
                <div className="space-y-4">
                  {[
                    { icon: Mail, label: "Email", value: "info@sentinelintegratedgroup.com", href: "mailto:info@sentinelintegratedgroup.com" },
                    { icon: Phone, label: "Phone", value: "(571) 555-0147", href: "tel:+15715550147" },
                    { icon: MapPin, label: "Location", value: "Washington DC Metro Area", href: null },
                  ].map((c) => (
                    <div key={c.label} className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-[#0066ff]/10 border border-[#0066ff]/20 flex items-center justify-center flex-shrink-0">
                        <c.icon className="w-4 h-4 text-[#0066ff]" />
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wider">{c.label}</div>
                        {c.href ? (
                          <a href={c.href} className="text-gray-300 text-sm hover:text-[#00d4ff] transition-colors break-all">{c.value}</a>
                        ) : (
                          <div className="text-gray-300 text-sm">{c.value}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Response Time */}
              <div className="tech-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-[#00e5a0]" />
                  <span className="text-white font-bold text-sm" style={{ fontFamily: "Sora, sans-serif" }}>Response Times</span>
                </div>
                <div className="space-y-2">
                  {[
                    { type: "General Inquiry", time: "< 24 hours" },
                    { type: "Proposal Request", time: "< 48 hours" },
                    { type: "Security Incident", time: "< 1 hour" },
                  ].map((r) => (
                    <div key={r.type} className="flex justify-between items-center">
                      <span className="text-gray-500 text-xs font-mono">{r.type}</span>
                      <span className="text-[#00e5a0] text-xs font-mono font-bold">{r.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clearance */}
              <div className="tech-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-[#0066ff]" />
                  <span className="text-white font-bold text-sm" style={{ fontFamily: "Sora, sans-serif" }}>Cleared Personnel</span>
                </div>
                <p className="text-gray-500 text-xs leading-relaxed">All client-facing staff hold minimum Public Trust clearances. Secret and TS/SCI available for classified engagements.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20 bg-[oklch(0.085_0.025_255)] border-y border-white/8 relative overflow-hidden">
        <div className="absolute inset-0 dot-matrix opacity-40" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="mb-10">
            <span className="section-label mb-4 inline-flex">Common Questions</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-4" style={{ fontFamily: "Sora, sans-serif" }}>
              Frequently Asked <span className="gradient-text">Questions</span>
            </h2>
          </div>
          <div className="max-w-3xl space-y-3">
            {faqs.map((faq, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.4 }}>
                <div className="tech-card overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left"
                  >
                    <span className="text-white font-medium text-sm pr-4" style={{ fontFamily: "Sora, sans-serif" }}>{faq.q}</span>
                    {openFaq === i ? <ChevronUp className="w-4 h-4 text-[#0066ff] flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />}
                  </button>
                  {openFaq === i && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 pb-5 border-t border-white/8 pt-4">
                      <p className="text-gray-400 text-sm leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
