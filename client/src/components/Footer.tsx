/* ============================================================
   Footer — Sentinel Sharp v2
   Design: Zero-radius, tech grid, data-stream divider
   Mobile: Single column stack with collapsible sections
   ============================================================ */
import { Link } from "wouter";
import { Shield, Mail, MapPin, Linkedin, Twitter, Github, Terminal, ArrowRight } from "lucide-react";

const serviceLinks = [
  { label: "Cybersecurity & Compliance", href: "/services#cybersecurity" },
  { label: "Custom Software Development", href: "/services#software" },
  { label: "Cloud & Infrastructure", href: "/services#cloud" },
  { label: "IT Consulting & PM", href: "/services#consulting" },
  { label: "DevSecOps", href: "/services#devsecops" },
];

const companyLinks = [
  { label: "Certifications", href: "/certifications" },
  { label: "Services", href: "/services" },
  { label: "Partners", href: "/partners" },
  { label: "Careers", href: "/careers" },
  { label: "Pricing", href: "/pricing" },
];

const certBadges = ["SDVOSB", "SBA 8(a)", "CMMC L2", "ISO 27001", "FedRAMP"];

export default function Footer() {
  return (
    <footer className="bg-[oklch(0.055_0.02_255)] border-t border-white/8 relative overflow-hidden">
      {/* Grid pattern */}
      <div className="absolute inset-0 grid-pattern opacity-40 pointer-events-none" />

      {/* Top accent */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-[#0066ff] to-[#00d4ff]" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 relative">

        {/* Main Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10 mb-10">

          {/* Brand Block */}
          <div className="sm:col-span-2 lg:col-span-2">
            <Link href="/">
              <div className="flex items-center gap-2.5 mb-5 group w-fit">
                <div className="relative w-9 h-9 bg-[#0066ff] flex items-center justify-center overflow-hidden">
                  <Shield className="w-5 h-5 text-white relative z-10" />
                  <div className="absolute inset-0 bg-[#00d4ff] translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <Shield className="w-5 h-5 text-white absolute z-20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </div>
                <div>
                  <div className="text-white font-bold text-lg leading-none" style={{ fontFamily: 'Sora, sans-serif' }}>SISG</div>
                  <div className="text-[9px] text-[#00d4ff]/70 tracking-[0.2em] uppercase leading-none mt-0.5 font-mono">Sentinel Group</div>
                </div>
              </div>
            </Link>

            <p className="text-gray-400 text-sm leading-relaxed mb-5 max-w-xs">
              Veteran-owned federal IT consulting and cybersecurity firm. Protecting mission-critical systems with precision and integrity.
            </p>

            {/* Cert Badges */}
            <div className="flex flex-wrap gap-2 mb-6">
              {certBadges.map((badge) => (
                <span key={badge} className="badge-info px-2 py-1 text-[10px]">{badge}</span>
              ))}
            </div>

            {/* Social */}
            <div className="flex items-center gap-2">
              {[
                { icon: Linkedin, href: "#" },
                { icon: Twitter, href: "#" },
                { icon: Github, href: "#" },
              ].map(({ icon: Icon, href }) => (
                <a
                  key={href + Icon.name}
                  href={href}
                  className="w-8 h-8 border border-white/10 flex items-center justify-center text-gray-500 hover:text-[#00d4ff] hover:border-[#0066ff]/50 transition-all"
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-widest uppercase mb-4 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              <span className="w-4 h-[1px] bg-[#0066ff]" />
              Services
            </h4>
            <ul className="space-y-2.5">
              {serviceLinks.map((s) => (
                <li key={s.label}>
                  <Link href={s.href}>
                    <span className="text-gray-500 hover:text-[#00d4ff] text-sm transition-colors flex items-center gap-1.5 group animated-underline">
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-[#0066ff]" />
                      {s.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-widest uppercase mb-4 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              <span className="w-4 h-[1px] bg-[#0066ff]" />
              Company
            </h4>
            <ul className="space-y-2.5">
              {companyLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href}>
                    <span className="text-gray-500 hover:text-[#00d4ff] text-sm transition-colors flex items-center gap-1.5 group animated-underline">
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-[#0066ff]" />
                      {item.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-widest uppercase mb-4 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              <span className="w-4 h-[1px] bg-[#0066ff]" />
              Contact
            </h4>
            <ul className="space-y-3">
              <li>
                <a href="mailto:info@sentinelintegratedgroup.com" className="flex items-start gap-2.5 group">
                  <Mail className="w-4 h-4 text-[#0066ff] mt-0.5 flex-shrink-0" />
                  <span className="text-gray-500 group-hover:text-gray-300 text-sm transition-colors break-all">
                    info@sentinelintegratedgroup.com
                  </span>
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#0066ff] mt-0.5 flex-shrink-0" />
                <span className="text-gray-500 text-sm">Washington DC Metro Area</span>
              </li>
              <li className="pt-2">
                <Link href="/contact">
                  <button className="btn-tech text-[11px] py-2 px-4 w-full sm:w-auto justify-center">
                    <Terminal className="w-3.5 h-3.5" />
                    Start a Conversation
                  </button>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="section-divider mb-6" />

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="badge-active px-2.5 py-1 text-[10px] flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-400 animate-pulse" />
              All Systems Operational
            </div>
            <p className="text-gray-600 text-xs font-mono">
              © 2025 Sentinel Integrated Solutions Group
            </p>
          </div>
          <div className="flex items-center gap-4">
            {["Privacy Policy", "Terms of Service", "Security"].map((item) => (
              <a key={item} href="#" className="text-gray-600 hover:text-gray-400 text-xs transition-colors font-mono">
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
