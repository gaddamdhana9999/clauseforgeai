import { createFileRoute } from "@tanstack/react-router";
import { useContract } from "@/lib/contract/store";
import { EmptyState } from "@/components/EmptyState";
import { ArrowRight, Lightbulb, ShieldAlert, TrendingDown, Scale, Quote, FileText } from "lucide-react";
import type { RiskItem } from "@/lib/contract/analyzer";

export const Route = createFileRoute("/negotiate")({
  head: () => ({
    meta: [{ title: "AI Negotiation Assistant — ClauseForge AI" }],
  }),
  component: NegotiatePage,
});

function reductionFor(item: RiskItem): number {
  // Reduction is derived from grounded severity + concrete evidence count.
  const base = item.severity === "high" ? 40 : item.severity === "medium" ? 25 : 10;
  return Math.min(55, base + Math.min(15, item.evidence.length * 5));
}

function strategyFor(item: RiskItem): string {
  // Strategy is composed from the actual evidence found in the contract.
  if (item.evidence.length === 0) {
    return `Use clause ${item.source.clauseNumber} (${item.source.heading}) as the anchor. Open with the recommended redline and trade non-economic concessions to secure it.`;
  }
  const bullets = item.evidence.map((e) => `"${e}"`).join("; ");
  return `Cite the specific drafting in clause ${item.source.clauseNumber} (${bullets}) as the trigger. Offer concessions on lower-priority terms in exchange for the redline above.`;
}

function NegotiatePage() {
  const { analysis } = useContract();
  if (!analysis)
    return <EmptyState title="No contract loaded" description="Load a contract to generate negotiation strategies." />;

  const risky = analysis.risks.filter((r) => r.severity !== "low");
  const items = risky.length ? risky : analysis.risks;

  const avgReduction =
    items.length === 0
      ? 0
      : Math.round(items.reduce((s, r) => s + reductionFor(r), 0) / items.length);
  const projectedRisk = Math.max(10, analysis.riskScore - avgReduction);

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
          Every redline below is generated from a specific clause that exists in the uploaded contract.
          Strategies cite the literal drafting that triggered the finding so each move is defensible at the table.
        </p>
        <div className="grid grid-cols-3 gap-4 mt-5 max-w-xl">
          <Stat label="Current Risk" value={`${analysis.riskScore}`} tone="danger" />
          <Stat label="Projected Risk" value={`${projectedRisk}`} tone="success" />
          <Stat label="Avg Reduction" value={`-${avgReduction}%`} tone="gold" />
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
  const reduction = reductionFor(item);
  const strategy = strategyFor(item);
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
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${sevColor}`}>
              {item.severity} risk
            </span>
            <span className="text-xs text-muted-foreground">{item.category}</span>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-secondary text-navy border border-border flex items-center gap-1">
              <FileText className="w-3 h-3" /> Source: clause {item.source.clauseNumber} · {item.source.heading}
            </span>
          </div>
          <h3 className="font-display font-semibold text-navy">{item.clause}</h3>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Est. Reduction</div>
          <div className="flex items-center gap-1 text-success font-display font-bold text-lg">
            <TrendingDown className="w-4 h-4" />-{reduction}%
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

        {item.evidence.length > 0 && (
          <div className="rounded-lg bg-secondary border border-border p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
              Evidence extracted from clause {item.source.clauseNumber}
            </div>
            <ul className="text-xs text-navy list-disc pl-5 space-y-0.5">
              {item.evidence.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <div className="text-[10px] uppercase tracking-wider text-destructive font-semibold mb-1">
              Current Drafting (clause {item.source.clauseNumber})
            </div>
            <div className="text-xs text-navy/80 leading-relaxed italic">{item.source.excerpt}</div>
          </div>
          <div className="rounded-lg border border-success/30 bg-success/5 p-3 relative">
            <div className="text-[10px] uppercase tracking-wider text-success font-semibold mb-1">
              Suggested Redline
            </div>
            <div className="text-xs text-navy leading-relaxed">{item.recommendation}</div>
            <ArrowRight className="absolute -left-4 top-1/2 -translate-y-1/2 hidden md:block w-5 h-5 text-muted-foreground bg-card rounded-full p-0.5 border border-border" />
          </div>
        </div>

        <div className="flex items-start gap-2 text-sm bg-secondary rounded-lg p-3">
          <Lightbulb className="w-4 h-4 text-gold shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-navy">Negotiation strategy: </span>
            <span className="text-muted-foreground">{strategy}</span>
          </div>
        </div>

        {item.excerpt && (
          <div className="text-[11px] text-muted-foreground bg-card border-l-2 border-gold p-2 rounded flex gap-2 items-start">
            <Quote className="w-3 h-3 text-gold shrink-0 mt-0.5" />
            <span className="italic">
              <b className="text-navy not-italic">Citation:</b> clause {item.source.clauseNumber} · {item.source.heading} — “{item.source.excerpt}”
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
