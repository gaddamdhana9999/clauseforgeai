import { createFileRoute } from "@tanstack/react-router";
import { useContract } from "@/lib/contract/store";
import { EmptyState } from "@/components/EmptyState";
import { Download, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Executive Report — LegalShield AI" },
      { name: "description", content: "Board-ready executive contract report with PDF export." },
    ],
  }),
  component: ReportPage,
});

const decisionStyle = {
  Approved: { bg: "bg-success", icon: CheckCircle2, copy: "Approved for signature without changes." },
  "Approved With Revisions": {
    bg: "bg-warning",
    icon: AlertCircle,
    copy: "Approve only after negotiating the items listed under Recommendations.",
  },
  "High Risk": {
    bg: "bg-destructive",
    icon: AlertTriangle,
    copy: "Do not sign without senior legal escalation. Material exposure detected.",
  },
} as const;

function ReportPage() {
  const { analysis, fileName } = useContract();
  if (!analysis) {
    return (
      <EmptyState
        title="No report available"
        description="Generate analysis by uploading a contract or loading the demo."
      />
    );
  }
  const d = decisionStyle[analysis.decision];
  const DIcon = d.icon;

  async function exportPdf() {
    if (!analysis) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const W = doc.internal.pageSize.getWidth();
    const M = 48;
    let y = M;

    // Header band
    doc.setFillColor(7, 27, 52);
    doc.rect(0, 0, W, 90, "F");
    doc.setTextColor(244, 185, 66);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("LEGALSHIELD AI · EXECUTIVE CONTRACT REPORT", M, 38);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text(fileName || "Contract Report", M, 62);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(analysis.type, M, 78);
    y = 120;

    const writeHeading = (t: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(13, 71, 161);
      doc.text(t, M, y);
      y += 18;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
    };
    const writeBody = (t: string) => {
      const lines = doc.splitTextToSize(t, W - M * 2);
      doc.text(lines, M, y);
      y += lines.length * 13 + 8;
      if (y > 720) {
        doc.addPage();
        y = M;
      }
    };

    writeHeading("1. Executive Summary");
    writeBody(analysis.summary);

    writeHeading("2. Key Findings");
    writeBody(
      `Parties: ${analysis.parties.join(", ")}.\nEffective: ${analysis.effectiveDate}. Expiration: ${analysis.expirationDate}.\nPayment Terms: ${analysis.paymentTerms}.\nGoverning Law: ${analysis.governingLaw}.\nTotal Clauses Reviewed: ${analysis.totalClauses}.`,
    );

    writeHeading("3. Risk Assessment");
    writeBody(`Overall Risk Score: ${analysis.riskScore}/100`);
    analysis.risks.forEach((r) => {
      writeBody(`• [${r.severity.toUpperCase()}] ${r.category}: ${r.explanation} Impact: ${r.impact}`);
    });

    writeHeading("4. Compliance Assessment");
    writeBody(
      `Compliance Score: ${analysis.complianceScore}%. The contract references the relevant regulatory frameworks and maintains industry-standard certifications where applicable.`,
    );

    writeHeading("5. Recommendations");
    analysis.risks
      .filter((r) => r.severity !== "low")
      .forEach((r) => writeBody(`• ${r.category}: ${r.recommendation}`));

    writeHeading("6. Final Decision");
    writeBody(`Decision: ${analysis.decision}. ${d.copy}`);

    doc.save(`LegalShield_Report_${(fileName || "contract").replace(/\.[^.]+$/, "")}.pdf`);
    toast.success("Executive report downloaded");
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Board-Ready Report</div>
          <h1 className="font-display font-bold text-2xl text-navy">Executive Contract Report</h1>
        </div>
        <button
          onClick={exportPdf}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md gradient-navy text-white text-sm font-medium hover:opacity-90"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>
      </div>

      <div className="card-elevated p-8 bg-card">
        <div className="border-b-4 border-gold pb-4 mb-6">
          <div className="text-xs uppercase tracking-widest text-royal font-semibold">LegalShield AI</div>
          <div className="font-display font-bold text-3xl text-navy mt-1">{fileName}</div>
          <div className="text-sm text-muted-foreground mt-1">
            {analysis.type} · {analysis.parties.join(" ↔ ")}
          </div>
        </div>

        <Section n="1" title="Executive Summary">
          <p>{analysis.summary}</p>
        </Section>

        <Section n="2" title="Key Findings">
          <ul className="grid md:grid-cols-2 gap-2 list-disc pl-5">
            <li><b>Effective:</b> {analysis.effectiveDate}</li>
            <li><b>Expiration:</b> {analysis.expirationDate}</li>
            <li><b>Payment Terms:</b> {analysis.paymentTerms}</li>
            <li><b>Governing Law:</b> {analysis.governingLaw}</li>
            <li><b>Notice Period:</b> {analysis.noticePeriod}</li>
            <li><b>Total Clauses:</b> {analysis.totalClauses}</li>
          </ul>
        </Section>

        <Section n="3" title="Risk Assessment">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl font-display font-bold text-navy">{analysis.riskScore}<span className="text-base text-muted-foreground">/100</span></div>
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-destructive text-white font-bold">{analysis.highCount} High</span>
              <span className="px-2 py-1 rounded bg-warning text-white font-bold">{analysis.mediumCount} Medium</span>
              <span className="px-2 py-1 rounded bg-success text-white font-bold">{analysis.lowCount} Low</span>
            </div>
          </div>
          <ul className="space-y-1.5 text-sm">
            {analysis.risks.map((r, i) => (
              <li key={i}>
                <b className="text-navy">{r.category}:</b> {r.explanation}
              </li>
            ))}
          </ul>
        </Section>

        <Section n="4" title="Compliance Assessment">
          <p>
            Compliance posture is rated at <b>{analysis.complianceScore}%</b>. The contract references
            applicable regulatory regimes and aligns with industry-standard certifications.
          </p>
        </Section>

        <Section n="5" title="Recommendations">
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            {analysis.risks
              .filter((r) => r.severity !== "low")
              .map((r, i) => (
                <li key={i}>
                  <b>{r.category}:</b> {r.recommendation}
                </li>
              ))}
            {analysis.risks.filter((r) => r.severity !== "low").length === 0 && (
              <li>No critical revisions required. Proceed with standard internal review.</li>
            )}
          </ul>
        </Section>

        <Section n="6" title="Final Decision">
          <div className={`${d.bg} text-white rounded-lg p-5 flex items-start gap-3`}>
            <DIcon className="w-7 h-7 shrink-0 mt-0.5" />
            <div>
              <div className="font-display font-bold text-xl">{analysis.decision}</div>
              <div className="text-sm text-white/90 mt-0.5">{d.copy}</div>
            </div>
          </div>
        </Section>

        <div className="text-xs text-muted-foreground text-center pt-4 border-t border-border">
          Generated by LegalShield AI · This report is informational and does not constitute legal advice.
        </div>
      </div>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="font-display font-bold text-navy text-lg mb-2 flex items-center gap-2">
        <span className="w-7 h-7 rounded-md bg-royal text-white text-xs flex items-center justify-center font-bold">
          {n}
        </span>
        {title}
      </h2>
      <div className="text-sm text-navy/90 leading-relaxed pl-9">{children}</div>
    </section>
  );
}
