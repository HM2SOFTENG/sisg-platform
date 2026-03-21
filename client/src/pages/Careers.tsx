/* Careers Page — Sentinel Sharp v2 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  Briefcase, MapPin, Clock, ArrowRight, Shield, Star,
  Users, DollarSign, Heart, Zap, ChevronDown, ChevronUp, Terminal
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const jobs = [
  { id: 1, title: "Senior Cybersecurity Engineer", dept: "Cybersecurity", location: "Washington DC (Hybrid)", type: "Full-Time", clearance: "Secret", salary: "$130K–$160K", accentColor: "#0066ff", skills: ["NIST 800-171", "Penetration Testing", "SIEM", "Zero Trust"] },
  { id: 2, title: "Cloud Solutions Architect", dept: "Cloud & Infrastructure", location: "Remote", type: "Full-Time", clearance: "Public Trust", salary: "$140K–$175K", accentColor: "#8b5cf6", skills: ["AWS GovCloud", "Terraform", "Kubernetes", "DevSecOps"] },
  { id: 3, title: "Full-Stack Software Engineer", dept: "Software Development", location: "Washington DC (Hybrid)", type: "Full-Time", clearance: "Public Trust", salary: "$110K–$145K", accentColor: "#00d4ff", skills: ["React", "Node.js", "TypeScript", "PostgreSQL"] },
  { id: 4, title: "Program Manager (PMP)", dept: "IT Consulting", location: "Washington DC (On-Site)", type: "Full-Time", clearance: "Secret", salary: "$120K–$155K", accentColor: "#00e5a0", skills: ["PMP", "Agile/SAFe", "ServiceNow", "Stakeholder Mgmt"] },
  { id: 5, title: "CMMC Compliance Specialist", dept: "Cybersecurity", location: "Remote", type: "Contract", clearance: "None Required", salary: "$90–$120/hr", accentColor: "#ff6b35", skills: ["CMMC", "NIST 800-171", "RMF", "ATO"] },
  { id: 6, title: "DevSecOps Engineer", dept: "Cloud & Infrastructure", location: "Remote (US Only)", type: "Full-Time", clearance: "Public Trust", salary: "$125K–$160K", accentColor: "#ffb800", skills: ["CI/CD", "Docker", "GitHub Actions", "SAST/DAST"] },
];

const benefits = [
  { icon: DollarSign, title: "Competitive Pay", desc: "Market-leading salaries with annual merit increases and performance bonuses.", color: "#00e5a0" },
  { icon: Heart, title: "Full Benefits", desc: "Medical, dental, vision, 401k with 5% match, and life insurance.", color: "#ff6b35" },
  { icon: Star, title: "Veteran Priority", desc: "Dedicated veteran hiring pipeline with mentorship and transition support.", color: "#ffb800" },
  { icon: Zap, title: "Growth & Training", desc: "$5,000/yr education budget, certification sponsorship, and conference attendance.", color: "#0066ff" },
  { icon: Users, title: "Mission-Driven", desc: "Work on contracts that protect national security and serve the American public.", color: "#00d4ff" },
  { icon: Shield, title: "Clearance Support", desc: "Full sponsorship for security clearance upgrades and polygraphs.", color: "#8b5cf6" },
];

function JobCard({ job }: { job: typeof jobs[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <div className="tech-card overflow-hidden">
        <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${job.accentColor}, transparent)` }} />
        <div className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: job.accentColor }}>{job.dept}</div>
              <h3 className="text-white font-bold text-base sm:text-lg" style={{ fontFamily: "Sora, sans-serif" }}>{job.title}</h3>
              <div className="flex flex-wrap gap-3 mt-2">
                <span className="flex items-center gap-1 text-gray-500 text-xs"><MapPin className="w-3 h-3" />{job.location}</span>
                <span className="flex items-center gap-1 text-gray-500 text-xs"><Clock className="w-3 h-3" />{job.type}</span>
                <span className="flex items-center gap-1 text-gray-500 text-xs"><Shield className="w-3 h-3" />{job.clearance}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right">
                <div className="text-white font-bold text-sm" style={{ fontFamily: "Sora, sans-serif", color: job.accentColor }}>{job.salary}</div>
                <div className="text-gray-600 text-[10px] font-mono">Annual</div>
              </div>
              <button
                onClick={() => setOpen(!open)}
                className="w-8 h-8 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/25 transition-all flex-shrink-0"
              >
                {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-white/8"
            >
              <div className="mb-4">
                <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wider mb-2">Required Skills</div>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((s) => (
                    <span key={s} className="text-xs font-mono px-2.5 py-1 border text-gray-400" style={{ borderColor: job.accentColor + "30", background: job.accentColor + "08" }}>{s}</span>
                  ))}
                </div>
              </div>
              <Link href="/contact">
                <button className="btn-tech text-xs py-2 px-5" style={{ background: job.accentColor }}>
                  Apply Now <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function Careers() {
  const [filter, setFilter] = useState("All");
  const depts = ["All", "Cybersecurity", "Cloud & Infrastructure", "Software Development", "IT Consulting"];
  const filtered = filter === "All" ? jobs : jobs.filter((j) => j.dept === filter);

  return (
    <div className="min-h-screen bg-[oklch(0.07_0.025_255)] overflow-x-hidden">
      <Navigation />

      {/* Hero */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="scan-overlay" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-4">
            <span className="section-label">Join the Mission</span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }} className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4" style={{ fontFamily: "Sora, sans-serif" }}>
            Build What <span className="gradient-text">Matters</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="text-gray-400 text-base sm:text-lg max-w-2xl">
            Join a veteran-led team protecting the nation's digital infrastructure. We value mission, mastery, and the people who serve.
          </motion.p>
        </div>
      </section>

      {/* Benefits */}
      <section className="pb-16 sm:pb-20 relative">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <span className="section-label mb-4 inline-flex">Why SISG</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-4" style={{ fontFamily: "Sora, sans-serif" }}>
              What We <span className="gradient-text">Offer</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {benefits.map((b, i) => (
              <motion.div key={b.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.4 }}>
                <div className="tech-card p-5 h-full">
                  <div className="w-10 h-10 flex items-center justify-center mb-3" style={{ background: b.color + "15", border: `1px solid ${b.color}30` }}>
                    <b.icon className="w-5 h-5" style={{ color: b.color }} />
                  </div>
                  <h3 className="text-white font-bold text-sm mb-2" style={{ fontFamily: "Sora, sans-serif" }}>{b.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{b.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Job Listings */}
      <section className="py-16 sm:py-20 bg-[oklch(0.085_0.025_255)] border-y border-white/8 relative overflow-hidden">
        <div className="absolute inset-0 dot-matrix opacity-40" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <span className="section-label mb-3 inline-flex">Open Positions</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mt-3" style={{ fontFamily: "Sora, sans-serif" }}>
                Current <span className="gradient-text">Openings</span>
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {depts.map((d) => (
                <button
                  key={d}
                  onClick={() => setFilter(d)}
                  className="text-xs font-mono px-3 py-1.5 border transition-all"
                  style={
                    filter === d
                      ? { borderColor: "#0066ff", background: "#0066ff15", color: "#00d4ff" }
                      : { borderColor: "rgba(255,255,255,0.1)", color: "rgba(156,163,175,1)" }
                  }
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            {filtered.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        </div>
      </section>

      {/* Veterans CTA */}
      <section className="py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#ffb800]/5 via-transparent to-[#0066ff]/5" />
        <div className="scan-overlay" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="tech-card p-8 sm:p-12 text-center">
            <div className="h-[2px] mb-8 -mx-8 sm:-mx-12 -mt-8 sm:-mt-12 bg-gradient-to-r from-[#ffb800] via-[#0066ff] to-[#00d4ff]" />
            <div className="w-14 h-14 bg-[#ffb800]/15 border border-[#ffb800]/30 flex items-center justify-center mx-auto mb-5">
              <Shield className="w-7 h-7 text-[#ffb800]" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4" style={{ fontFamily: "Sora, sans-serif" }}>
              Veteran? <span className="gradient-text-gold">You're Our Priority.</span>
            </h2>
            <p className="text-gray-400 text-base max-w-xl mx-auto mb-6">
              As an SDVOSB, we have a dedicated veteran hiring pipeline. We understand your service, value your discipline, and will fast-track your application.
            </p>
            <Link href="/contact">
              <button className="btn-tech py-3 px-8 text-sm" style={{ background: "#ffb800" }}>
                <Terminal className="w-4 h-4" /> Veterans Apply Here
              </button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
