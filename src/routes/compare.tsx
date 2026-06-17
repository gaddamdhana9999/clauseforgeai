import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { useContract } from "@/lib/contract/store";
import { extractPdfText } from "@/lib/contract/pdf";
import { EmptyState } from "@/components/EmptyState";
import type { ContractAnalysis } from "@/lib/contract/analyzer";
import { ArrowRightLeft, Upload, FileCheck2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/compare")({
  head: () => ({ meta: [{ title: "Contract Comparison — LegalShield AI" }] }),
  component: ComparePage,
});

function ComparePage() {
  const { analysis, fileName, compareAnalysis, compareFileName, loadCompare, loadCompareDemo } = useContract();
  const fileRef = useRef<HTMLInputElement>(null);

  if (!analysis) {
    return <EmptyState title="Load a primary contract first" description="Upload or load the demo from the Upload page." />;
  }

  const onFile = async (f: File) => {
    try {
      toast.loading("Extracting comparison contract…", { id: "cmp" });
      const text = await extractPdfText(f);
      loadCompare(f.name, text);
      toast.success("Comparison loaded", { id: "cmp" });
    } catch (e) {
      toast.error("Could not parse PDF", { id: "cmp" });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card-elevated p-6 gradient-navy text-white flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs uppercase tracking-wider text-gold/90">
            <ArrowRightLeft className="w-4 h-4" /> Contract Comparison
          </div>
          <div className="font-display font-bold text-xl">Side-by-Side Risk &amp; Clause Diff</div>
          <p className="text-white/70 text-sm mt-1 max-w-2xl">
            Compare your active contract against a second version or counter-party draft.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-white text-sm font-medium flex items-center gap-2"
          >
            <Upload className="w-4 h-4" /> Upload Second
          </button>
          <button
            onClick={() => {
              loadCompareDemo();
              toast.success("Demo comparison contract loaded");
            }}
            className="px-4 py-2 rounded-md bg-gold text-navy text-sm font-medium hover:opacity-90 flex items-center gap-2"
          >
            <FileCheck2 className="w-4 h-4" /> Load Demo B
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </div>
      </div>

      {!compareAnalysis ? (
        <EmptyState
          title="No comparison contract yet"
          description="Load a second contract above to see a side-by-side diff. The demo comparison shows a riskier renewal draft."
        />
      ) : (
        <Comparison
          aName={fileName ?? "Contract A"}
          bName={compareFileName ?? "Contract B"}
          a={analysis}
          b={compareAnalysis}
        />
      )}
    </div>
  );
}

function Comparison({
  aName,
  bName,
  a,
  b,
}: {
  aName: string;
  bName: string;
  a: ContractAnalysis;
  b: ContractAnalysis;
}) {
  const better = (av: number, bv: number, lowerIsBetter = false) => {
    if (av === bv) return "tie";
    if (lowerIsBetter) return av < bv ? "a" : "b";
    return av > bv ? "a" : "b";
  };

  const rows: { label: string; av: string | number; bv: string | number; winner: string }[] = [
    { label: "Risk Score (lower is better)", av: a.riskScore, bv: b.riskScore, winner: better(a.riskScore, b.riskScore, true) },
    { label: "Compliance Score", av: `${a.complianceScore}%`, bv: `${b.complianceScore}%`, winner: better(a.complianceScore, b.complianceScore) },
    { label: "High-Risk Findings", av: a.highCount, bv: b.highCount, winner: better(a.highCount, b.highCount, true) },
    { label: "Medium-Risk Findings", av: a.mediumCount, bv: b.mediumCount, winner: better(a.mediumCount, b.mediumCount, true) },
    { label: "Total Clauses", av: a.totalClauses, bv: b.totalClauses, winner: "tie" },
    { label: "Decision", av: a.decision, bv: b.decision, winner: "tie" },
    { label: "Governing Law", av: a.governingLaw, bv: b.governingLaw, winner: "tie" },
    { label: "Payment Terms", av: a.paymentTerms, bv: b.paymentTerms, winner: "tie" },
  ];

  const aCats = new Set(a.risks.map((r) => r.category));
  const bCats = new Set(b.risks.map((r) => r.category));
  const missingInB = [...aCats].filter((c) => !bCats.has(c));
  const missingInA = [...bCats].filter((c) => !aCats.has(c));

  const recommendation =
    a.riskScore <= b.riskScore
      ? `Retain Contract A (${aName}) as the negotiation baseline — it carries lower aggregate risk (${a.riskScore} vs ${b.riskScore}) and stronger compliance posture (${a.complianceScore}% vs ${b.complianceScore}%).`
      : `Contract B (${bName}) presents a lower aggregate risk score. Consider adopting its more favorable clauses while preserving Contract A's compliance language.`;

  return (
    <>
      <div className="grid md:grid-cols-2 gap-4">
        <ContractHeader name={aName} a={a} accent="royal" />
        <ContractHeader name={bName} a={b} accent="navy" />
      </div>

      <div className="card-elevated overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-display font-semibold text-navy">Side-by-Side Metrics</h3>
        </div>
        <div className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.label} className="grid grid-cols-12 gap-2 px-5 py-3 text-sm items-center">
              <div className="col-span-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                {r.label}
              </div>
              <div className={`col-span-4 ${r.winner === "a" ? "font-semibold text-success" : "text-navy"}`}>
                {r.winner === "a" && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1 text-success" />}
                {r.av}
              </div>
              <div className={`col-span-4 ${r.winner === "b" ? "font-semibold text-success" : "text-navy"}`}>
                {r.winner === "b" && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1 text-success" />}
                {r.bv}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <DiffList title="Clauses present in A, missing in B" items={missingInB} tone="danger" />
        <DiffList title="Clauses present in B, missing in A" items={missingInA} tone="warn" />
      </div>

      <div className="card-elevated p-5 border-l-4 border-l-gold">
        <div className="text-[10px] uppercase tracking-wider text-gold font-semibold mb-1">
          Executive Recommendation
        </div>
        <p className="text-sm text-navy leading-relaxed">{recommendation}</p>
      </div>
    </>
  );
}

function ContractHeader({ name, a, accent }: { name: string; a: ContractAnalysis; accent: "royal" | "navy" }) {
  const tone = accent === "royal" ? "border-l-royal" : "border-l-navy";
  return (
    <div className={`card-elevated p-5 border-l-4 ${tone}`}>
      <div className="text-xs text-muted-foreground truncate" title={name}>
        {name}
      </div>
      <div className="font-display font-bold text-navy mt-0.5">{a.type}</div>
      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <Pill label="Risk" value={a.riskScore} tone={a.riskScore >= 65 ? "danger" : a.riskScore >= 35 ? "warn" : "success"} />
        <Pill label="Compliance" value={`${a.complianceScore}%`} tone="royal" />
        <Pill label="Decision" value={a.decision.split(" ")[0]} tone="navy" />
      </div>
    </div>
  );
}

function Pill({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  const cls: Record<string, string> = {
    danger: "bg-destructive/10 text-destructive",
    warn: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success",
    royal: "bg-royal/10 text-royal",
    navy: "bg-navy/10 text-navy",
  };
  return (
    <div className={`rounded-md py-2 ${cls[tone]}`}>
      <div className="text-[9px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="font-display font-bold text-sm">{value}</div>
    </div>
  );
}

function DiffList({ title, items, tone }: { title: string; items: string[]; tone: "danger" | "warn" }) {
  const Icon = tone === "danger" ? XCircle : AlertTriangle;
  const color = tone === "danger" ? "text-destructive" : "text-warning";
  return (
    <div className="card-elevated p-5">
      <h4 className="font-display font-semibold text-navy mb-3 text-sm">{title}</h4>
      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-success" /> No missing clauses detected.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((i) => (
            <li key={i} className={`text-sm flex items-center gap-2 ${color}`}>
              <Icon className="w-3.5 h-3.5" />
              <span className="text-navy">{i}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
