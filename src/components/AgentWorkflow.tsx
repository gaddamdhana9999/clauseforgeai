import { useEffect, useState } from "react";
import {
  Upload,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  FileBarChart,
  Loader2,
} from "lucide-react";

const STEPS = [
  { name: "Upload Agent", desc: "Ingest PDF & OCR extraction", icon: Upload },
  { name: "Clause Extraction Agent", desc: "Segment & classify clauses", icon: ScanSearch },
  { name: "Risk Analysis Agent", desc: "Score severity per clause", icon: ShieldAlert },
  { name: "Compliance Agent", desc: "Map to GDPR / SOC2 / HIPAA", icon: ShieldCheck },
  { name: "Verification Agent", desc: "Cross-validate findings", icon: CheckCircle2 },
  { name: "Executive Report Agent", desc: "Compose board-ready report", icon: FileBarChart },
] as const;

type Status = "queued" | "running" | "complete";

export function AgentWorkflow({ compact = false }: { compact?: boolean }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (active >= STEPS.length) return;
    const t = setTimeout(() => setActive((a) => a + 1), 700);
    return () => clearTimeout(t);
  }, [active]);

  const statusOf = (i: number): Status =>
    i < active ? "complete" : i === active ? "running" : "queued";

  return (
    <div className="card-elevated p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display font-semibold text-navy">Multi-Agent AI Workflow</h3>
        {active >= STEPS.length ? (
          <span className="text-xs text-success font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Pipeline Complete
          </span>
        ) : (
          <span className="text-xs text-royal font-medium flex items-center gap-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing…
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-5">
        Six specialized agents collaborate to deliver enterprise-grade contract intelligence.
      </p>

      <div
        className={`grid gap-3 ${compact ? "md:grid-cols-3 lg:grid-cols-6" : "md:grid-cols-2 lg:grid-cols-3"}`}
      >
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const st = statusOf(i);
          const ring =
            st === "complete"
              ? "border-success/40 bg-success/5"
              : st === "running"
                ? "border-royal/50 bg-royal/5 shadow-[0_0_0_3px_rgba(13,71,161,0.08)]"
                : "border-border bg-secondary";
          const badge =
            st === "complete"
              ? "bg-success text-white"
              : st === "running"
                ? "bg-royal text-white"
                : "bg-muted text-muted-foreground";
          return (
            <div
              key={s.name}
              className={`rounded-lg border p-3 transition-all duration-300 ${ring}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center ${badge}`}
                >
                  {st === "running" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="text-xs font-semibold text-navy">{s.name}</div>
              </div>
              <div className="text-[11px] text-muted-foreground pl-9">{s.desc}</div>
              <div className="pl-9 mt-1.5">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider ${
                    st === "complete"
                      ? "text-success"
                      : st === "running"
                        ? "text-royal"
                        : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      st === "complete"
                        ? "bg-success"
                        : st === "running"
                          ? "bg-royal animate-pulse"
                          : "bg-muted-foreground/50"
                    }`}
                  />
                  {st}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
