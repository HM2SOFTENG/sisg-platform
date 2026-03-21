"use client";

import React, { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Copy, Loader } from "lucide-react";

interface FormData {
  templateType: "Assessment" | "Modernization" | "Security" | "Intelligence" | "Custom";
  clientName: string;
  contractValue: string;
  scope: string;
  startDate: string;
  endDate: string;
  specialTerms: string;
}

export default function AIContractGen() {
  const [formData, setFormData] = useState<FormData>({
    templateType: "Assessment",
    clientName: "",
    contractValue: "",
    scope: "",
    startDate: "",
    endDate: "",
    specialTerms: "",
  });
  const [generatedContract, setGeneratedContract] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const generateContractTemplate = (data: FormData): string => {
    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    const scopeText = data.scope || "Professional services as defined herein";
    const termsText = data.specialTerms
      ? `\n\n${data.specialTerms}`
      : "\nStandard commercial terms and conditions apply.";

    return `═══════════════════════════════════════════════════════════════════════════════

                           PROFESSIONAL SERVICES CONTRACT

═══════════════════════════════════════════════════════════════════════════════

HEADER
─────────────────────────────────────────────────────────────────────────────

Contract Type: ${data.templateType} Services
Contract Value: $${parseFloat(data.contractValue || "0").toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}
Duration: ${formatDate(data.startDate)} to ${formatDate(data.endDate)}
Status: DRAFT

═══════════════════════════════════════════════════════════════════════════════

PARTIES
─────────────────────────────────────────────────────────────────────────────

CLIENT:
  Name: ${data.clientName}
  Address: [Client Address]
  Contact: [Client Contact Information]

SERVICE PROVIDER:
  Name: SISG Platform
  Address: [Provider Address]
  Contact: [Provider Contact Information]

═══════════════════════════════════════════════════════════════════════════════

SCOPE OF WORK
─────────────────────────────────────────────────────────────────────────────

The Service Provider agrees to deliver the following services:

${scopeText}

Key Deliverables:
  • Detailed assessment and analysis
  • Comprehensive documentation
  • Implementation recommendations
  • Post-delivery support

═══════════════════════════════════════════════════════════════════════════════

DURATION
─────────────────────────────────────────────────────────────────────────────

Start Date: ${formatDate(data.startDate)}
End Date: ${formatDate(data.endDate)}
Duration: [Calculated duration]

═══════════════════════════════════════════════════════════════════════════════

COMPENSATION
─────────────────────────────────────────────────────────────────────────────

Total Contract Value: $${parseFloat(data.contractValue || "0").toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}

Payment Schedule:
  • 30% upon contract execution
  • 40% upon midpoint completion
  • 30% upon final delivery

Payment Terms: Net 30 days from invoice date

═══════════════════════════════════════════════════════════════════════════════

TERMS & CONDITIONS
─────────────────────────────────────────────────────────────────────────────

1. PERFORMANCE & RESPONSIBILITIES
   The Service Provider shall perform all services professionally and in
   accordance with industry best practices.

2. CONFIDENTIALITY
   Both parties agree to maintain confidentiality of proprietary information
   shared during the engagement.

3. INTELLECTUAL PROPERTY
   All work product shall be the property of the Client upon full payment.

4. INDEPENDENT CONTRACTOR
   Service Provider is an independent contractor and not an employee.

5. LIABILITY & INDEMNIFICATION
   Service Provider shall maintain appropriate insurance coverage and shall
   indemnify Client against third-party claims.

6. TERMINATION
   Either party may terminate with 30 days written notice. Client shall pay
   for all services rendered through the termination date.

7. DISPUTE RESOLUTION
   Any disputes shall be resolved through negotiation, mediation, or binding
   arbitration as mutually agreed.

8. GENERAL PROVISIONS
   • Entire Agreement: This contract constitutes the entire agreement
   • Amendments: Must be in writing and signed by both parties
   • Governing Law: [Jurisdiction]
   • Force Majeure: Neither party liable for acts beyond reasonable control${termsText}

═══════════════════════════════════════════════════════════════════════════════

SIGNATURES
─────────────────────────────────────────────────────────────────────────────

By signing below, both parties agree to the terms and conditions outlined in
this contract.

FOR THE CLIENT:

Name: _____________________________  Date: ________________

Signature: _________________________

Title: _____________________________


FOR THE SERVICE PROVIDER:

Name: _____________________________  Date: ________________

Signature: _________________________

Title: _____________________________

═══════════════════════════════════════════════════════════════════════════════
`;
  };

  const handleGenerate = async () => {
    if (!formData.clientName || !formData.contractValue || !formData.startDate || !formData.endDate) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      const contract = generateContractTemplate(formData);
      setGeneratedContract(contract);

      // Optionally post to backend
      try {
        const token = localStorage.getItem("sisg_admin_token");
        await fetch("/api/admin/contracts/generate", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });
      } catch (error) {
        console.log("Note: Could not save to backend, but contract generated locally");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedContract);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
            AI Contract <span className="gradient-text">Generator</span>
          </h1>
          <p className="text-gray-400 mt-2">Generate professional service contracts from templates</p>
        </motion.div>

        {/* Main Layout */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-6"
        >
          {/* Left Panel - Configuration Form */}
          <div className="tech-card p-6 h-fit space-y-4">
            <h2 className="text-white font-bold text-lg" style={{ fontFamily: "Sora, sans-serif" }}>
              Contract Configuration
            </h2>

            <div>
              <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">
                Template Type
              </label>
              <select
                value={formData.templateType}
                onChange={(e) => handleInputChange("templateType", e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 outline-none hover:border-white/20 transition-colors"
              >
                <option value="Assessment">Assessment</option>
                <option value="Modernization">Modernization</option>
                <option value="Security">Security</option>
                <option value="Intelligence">Intelligence</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">
                Client Name *
              </label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => handleInputChange("clientName", e.target.value)}
                placeholder="e.g., Acme Corporation"
                className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-600 px-3 py-2 outline-none hover:border-white/20 transition-colors"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">
                Contract Value ($) *
              </label>
              <input
                type="number"
                value={formData.contractValue}
                onChange={(e) => handleInputChange("contractValue", e.target.value)}
                placeholder="e.g., 250000"
                className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-600 px-3 py-2 outline-none hover:border-white/20 transition-colors"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">
                Scope of Work
              </label>
              <textarea
                value={formData.scope}
                onChange={(e) => handleInputChange("scope", e.target.value)}
                placeholder="Describe the services to be provided..."
                className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-600 px-3 py-2 outline-none hover:border-white/20 transition-colors"
                rows={3}
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange("startDate", e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 outline-none hover:border-white/20 transition-colors"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">
                End Date *
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange("endDate", e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 outline-none hover:border-white/20 transition-colors"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest block mb-2">
                Special Terms & Conditions
              </label>
              <textarea
                value={formData.specialTerms}
                onChange={(e) => handleInputChange("specialTerms", e.target.value)}
                placeholder="Any additional terms or conditions..."
                className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-600 px-3 py-2 outline-none hover:border-white/20 transition-colors"
                rows={3}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-[#0066ff] text-white font-bold py-3 hover:bg-[#0052cc] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" /> Generating...
                </>
              ) : (
                "Generate Contract"
              )}
            </button>
          </div>

          {/* Right Panel - Generated Contract Preview */}
          <div className="tech-card p-6 space-y-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center">
              <h2 className="text-white font-bold text-lg" style={{ fontFamily: "Sora, sans-serif" }}>
                Contract Preview
              </h2>
              {generatedContract && (
                <button
                  onClick={handleCopyToClipboard}
                  className="flex items-center gap-2 px-3 py-2 bg-[#00e5a0]/20 text-[#00e5a0] hover:bg-[#00e5a0]/30 transition-colors text-sm"
                >
                  <Copy size={16} /> {copied ? "Copied!" : "Copy"}
                </button>
              )}
            </div>

            {generatedContract ? (
              <div className="flex-1 overflow-y-auto bg-white/5 p-4">
                <pre className="text-[11px] font-mono text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
                  {generatedContract}
                </pre>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-500 text-center">
                  Fill in the configuration form and click "Generate Contract" to create a new contract
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
