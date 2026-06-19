import { createFileRoute } from "@tanstack/react-router";
import { useContract } from "@/lib/contract/store";
import { EmptyState } from "@/components/EmptyState";
import type { Severity } from "@/lib/contract/analyzer";
import { AlertTriangle, AlertCircle, ShieldCheck, Quote } from "lucide-react";

export const Route = createFileRoute("/risk")({
  head: () => ({
    meta: [
      { title: "Risk Analysis — ClauseForge AI" },
      { name: "description", content: "Clause-level risk analysis with severity and recommendations." },
    ],
  }),
  component: RiskPage,
});

const SEV_STYLE: Record<Severity, { bg: string; text: string; label: string; icon: any }> = {
  high: { bg: "bg-destructive", text: "text-white", label: "HIGH", icon: AlertTriangle },
  medium: { bg: "bg-warning", text: "text-white", label: "MEDIUM", icon: AlertCircle },
  low: { bg: "bg-success", text: "text-white", label: "LOW", icon: ShieldCheck },
};

function Gauge({ score }: { score: number }) {
  const angle = (score / 100) * 180 - 90;
  const color = score >= 65 ? "#DC2626" : score >= 35 ? "#F59E0B" : "#16A34A";
  return (
    <div className="relative w-64 h-32 mx-auto">
      <svg viewBox="0 0 200 110" className="w-full h-full">
        <path d="M 10 100 A 90 90 0 0 1 190 100" fill="none" stroke="#E2E8F0" strokeWidth="16" strokeLinecap="round" />
        <path
          d="M 10 100 A 90 90 0 0 1 190 100"
          fill="none"
          stroke={color}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 283} 283`}
        />
        <line
          x1="100"
          y1="100"
          x2={100 + 70 * Math.cos((angle * Math.PI) / 180)}
          y2={100 + 70 * Math.sin((angle * Math.PI) / 180)}
          stroke="#071B34"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="100" cy="100" r="6" fill="#071B34" />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 text-center">
        <div className="text-4xl font-display font-bold text-navy">{score}</div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider">Overall Risk</div>
      </div>
    </div>
  );
}

function RiskPage() {
  const { analysis } = useContract();
  if (!analysis) {
    return (
      <EmptyState
        title="No risk analysis yet"
        description="Upload a contract or load the demo to generate clause-level risk analysis."
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card-elevated p-6 lg:col-span-1">
          <h3 className="font-display font-semibold text-navy mb-2">Overall Risk Score</h3>
          <Gauge score={analysis.riskScore} />
          <div className="grid grid-cols-3 gap-2 mt-6 text-center">
            <div>
              <div className="text-xl font-bold text-destructive">{analysis.highCount}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">High</div>
            </div>
            <div>
              <div className="text-xl font-bold text-warning">{analysis.mediumCount}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Medium</div>
            </div>
            <div>
              <div className="text-xl font-bold text-success">{analysis.lowCount}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Low</div>
            </div>
          </div>
        </div>

        <div className="card-elevated p-6 lg:col-span-2 gradient-navy text-white">
          <div className="text-xs uppercase tracking-wider text-gold mb-1">Risk Verdict</div>
          <h3 className="font-display font-bold text-2xl mb-2">{analysis.decision}</h3>
          <p className="text-white/80 text-sm">
            {analysis.decision === "Approved"
              ? "Contract is well-balanced. Standard execution recommended with routine internal review."
              : analysis.decision === "Approved With Revisions"
              ? "Acceptable with targeted negotiation. Address the medium and high-severity findings below before signing."
              : "Substantial risk exposure detected. Legal escalation strongly recommended before any commitment."}
          </p>
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-gold">Risk Score</div>
              <div className="text-2xl font-display font-bold">{analysis.riskScore}/100</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-gold">Compliance</div>
              <div className="text-2xl font-display font-bold">{analysis.complianceScore}%</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-gold">Categories</div>
              <div className="text-2xl font-display font-bold">{analysis.risks.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-display font-bold text-navy text-xl mb-3">Clause-Level Findings</h2>
        <div className="space-y-3">
          {analysis.risks.map((r, i) => {
            const s = SEV_STYLE[r.severity];
            const Icon = s.icon;
            return (
              <div key={i} className="card-elevated p-5 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${s.bg} ${s.text} flex items-center justify-center`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-display font-semibold text-navy">{r.category}</div>
                      <div className="text-xs text-muted-foreground">{r.clause}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full ${s.bg} ${s.text} font-bold tracking-wider`}>
                    {s.label}
                  </span>
                </div>

                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                      Explanation
                    </div>
                    <p className="text-navy">{r.explanation}</p>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                      Business Impact
                    </div>
                    <p className="text-navy">{r.impact}</p>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                      Recommended Action
                    </div>
                    <p className="text-navy">{r.recommendation}</p>
                  </div>
                </div>

                {r.excerpt && (
                  <div className="mt-3 p-3 bg-secondary border-l-2 border-gold rounded text-xs italic text-muted-foreground flex gap-2">
                    <Quote className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gold" />
                    {r.excerpt}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
