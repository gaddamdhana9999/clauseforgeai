import { createFileRoute } from "@tanstack/react-router";
import { useContract } from "@/lib/contract/store";
import { EmptyState } from "@/components/EmptyState";
import { ArrowRight, Lightbulb, ShieldAlert, TrendingDown, Scale } from "lucide-react";
import type { RiskItem } from "@/lib/contract/analyzer";

export const Route = createFileRoute("/negotiate")({
  head: () => ({
    meta: [{ title: "AI Negotiation Assistant — LegalShield AI" }],
  }),
  component: NegotiatePage,
});

const PLAYBOOK: Record<
  string,
  { redline: string; strategy: string; reduction: number }
> = {
  "Payment Risk": {
    redline:
      "Client shall pay undisputed fees within forty-five (45) days of invoice. Late fees shall not exceed one percent (1.0%) per month, with a fifteen (15) day grace period before interest accrues.",
    strategy:
      "Anchor on Net 45 citing enterprise procurement standards. Trade a faster payment cycle for the lower interest cap and grace period.",
    reduction: 35,
  },
  "Liability Risk": {
    redline:
      "Each Party's aggregate liability shall be capped at the greater of (a) fees paid in the prior 24 months, or (b) $5,000,000. Caps shall NOT apply to breach of confidentiality, IP infringement, gross negligence, or willful misconduct.",
    strategy:
      "Frame as standard enterprise carve-outs. Concede on 12-month cap if mutual super-cap and named exclusions are accepted.",
    reduction: 45,
  },
  "Termination Risk": {
    redline:
      "Either Party may terminate for convenience upon sixty (60) days prior written notice. Client may additionally terminate immediately upon a change-of-control event affecting Service Provider.",
    strategy:
      "Position 60 days as market standard. Use change-of-control clause as protection against acquisition risk.",
    reduction: 30,
  },
  "Compliance Risk": {
    redline:
      "Service Provider shall maintain SOC 2 Type II, ISO 27001, and applicable GDPR/CCPA/HIPAA compliance throughout the term, and shall notify Client within 24 hours of any material certification lapse or security incident.",
    strategy:
      "Tie compliance failures to termination right and SLA credits. Require annual independent audit reports.",
    reduction: 40,
  },
  "IP Risk": {
    redline:
      "All deliverables created specifically for Client shall be assigned to Client upon creation. Background IP shall be expressly defined in each SOW and granted to Client under a perpetual, irrevocable, royalty-free license.",
    strategy:
      "Distinguish Background IP from Deliverables. Demand perpetual license on any embedded components.",
    reduction: 38,
  },
  "Confidentiality Risk": {
    redline:
      "Confidentiality obligations shall survive for three (3) years post-termination, except for trade secrets which shall remain confidential for so long as they qualify as trade secrets under applicable law.",
    strategy:
      "Cite three-year market norm. Acknowledge perpetual protection only for genuine trade secrets.",
    reduction: 25,
  },
};

function NegotiatePage() {
  const { analysis } = useContract();
  if (!analysis) return <EmptyState title="No contract loaded" description="Load a contract to generate negotiation strategies." />;

  const risky = analysis.risks.filter((r) => r.severity !== "low");
  const items = risky.length ? risky : analysis.risks;

  const totalReduction = Math.min(
    60,
    Math.round(
      items.reduce((s, r) => s + (PLAYBOOK[r.category]?.reduction ?? 20), 0) / items.length,
    ),
  );
  const projectedRisk = Math.max(10, analysis.riskScore - totalReduction);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card-elevated p-6 gradient-navy text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg gradient-gold flex items-center justify-center text-navy">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-gold/90">AI Negotiation Assistant</div>
            <div className="font-display font-bold text-xl">Redline Strategy &amp; Counter-Proposals</div>
          </div>
        </div>
        <p className="text-white/80 text-sm max-w-3xl">
          For each risky clause, the negotiation agent generated a suggested redline, the rationale, and a
          quantitative risk-reduction estimate based on enterprise playbook patterns.
        </p>
        <div className="grid grid-cols-3 gap-4 mt-5 max-w-xl">
          <Stat label="Current Risk" value={`${analysis.riskScore}`} tone="danger" />
          <Stat label="Projected Risk" value={`${projectedRisk}`} tone="success" />
          <Stat label="Avg Reduction" value={`-${totalReduction}%`} tone="gold" />
        </div>
      </div>

      <div className="space-y-4">
        {items.map((r) => (
          <NegotiationCard key={r.category} item={r} />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "danger" | "success" | "gold" }) {
  const t = { danger: "text-destructive", success: "text-success", gold: "text-gold" }[tone];
  return (
    <div className="bg-white/10 rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wider text-white/60">{label}</div>
      <div className={`text-2xl font-display font-bold ${t}`}>{value}</div>
    </div>
  );
}

function NegotiationCard({ item }: { item: RiskItem }) {
  const p = PLAYBOOK[item.category] ?? {
    redline: item.recommendation,
    strategy: "Apply standard enterprise negotiation patterns and benchmark against comparable agreements.",
    reduction: 20,
  };
  const sevColor =
    item.severity === "high"
      ? "bg-destructive text-white"
      : item.severity === "medium"
        ? "bg-warning text-white"
        : "bg-success text-white";

  return (
    <div className="card-elevated overflow-hidden">
      <div className="p-5 border-b border-border flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${sevColor}`}>
              {item.severity} risk
            </span>
            <span className="text-xs text-muted-foreground">{item.category}</span>
          </div>
          <h3 className="font-display font-semibold text-navy">{item.clause}</h3>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Est. Reduction</div>
          <div className="flex items-center gap-1 text-success font-display font-bold text-lg">
            <TrendingDown className="w-4 h-4" />-{p.reduction}%
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-start gap-2 text-sm">
          <ShieldAlert className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-navy">Why it's risky: </span>
            <span className="text-muted-foreground">{item.explanation}</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <div className="text-[10px] uppercase tracking-wider text-destructive font-semibold mb-1">
              Current Clause
            </div>
            <div className="text-xs text-navy/80 leading-relaxed italic">{item.excerpt || "Original clause language present in contract."}</div>
          </div>
          <div className="rounded-lg border border-success/30 bg-success/5 p-3 relative">
            <div className="text-[10px] uppercase tracking-wider text-success font-semibold mb-1">
              Suggested Redline
            </div>
            <div className="text-xs text-navy leading-relaxed">{p.redline}</div>
            <ArrowRight className="absolute -left-4 top-1/2 -translate-y-1/2 hidden md:block w-5 h-5 text-muted-foreground bg-card rounded-full p-0.5 border border-border" />
          </div>
        </div>

        <div className="flex items-start gap-2 text-sm bg-secondary rounded-lg p-3">
          <Lightbulb className="w-4 h-4 text-gold shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-navy">Negotiation strategy: </span>
            <span className="text-muted-foreground">{p.strategy}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
