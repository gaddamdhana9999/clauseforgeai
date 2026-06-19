import { createFileRoute } from "@tanstack/react-router";
import { useContract } from "@/lib/contract/store";
import { EmptyState } from "@/components/EmptyState";
import {
  FileText,
  Users,
  CalendarClock,
  CalendarX,
  CreditCard,
  XCircle,
  Lock,
  Gavel,
  ListChecks,
  Scale,
  Layers,
  Tag,
} from "lucide-react";

export const Route = createFileRoute("/summary")({
  head: () => ({
    meta: [
      { title: "Contract Summary — ClauseForge AI" },
      { name: "description", content: "Executive summary of contract terms and obligations." },
    ],
  }),
  component: SummaryPage,
});

function Card({
  icon: Icon,
  label,
  children,
}: {
  icon: any;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card-elevated p-5">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-md gradient-navy text-gold flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </div>
      </div>
      <div className="text-navy text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function SummaryPage() {
  const { analysis, fileName } = useContract();
  if (!analysis) {
    return (
      <EmptyState
        title="No contract to summarize"
        description="Upload a contract or load the demo to generate an executive summary."
      />
    );
  }
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card-elevated p-6 gradient-navy text-white">
        <div className="text-xs uppercase tracking-wider text-gold mb-1">Executive Summary</div>
        <h1 className="font-display font-bold text-2xl mb-2 truncate">{fileName}</h1>
        <p className="text-white/80 text-sm max-w-3xl">{analysis.summary}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card icon={FileText} label="Contract Type">
          <div className="font-display font-semibold text-lg">{analysis.type}</div>
        </Card>

        <Card icon={Users} label="Parties">
          <ul className="space-y-1">
            {analysis.parties.map((p) => (
              <li key={p} className="font-medium">
                • {p}
              </li>
            ))}
          </ul>
        </Card>

        <Card icon={CalendarClock} label="Effective Date">
          <div className="font-display font-semibold">{analysis.effectiveDate}</div>
        </Card>

        <Card icon={CalendarX} label="Expiration Date">
          <div className="font-display font-semibold">{analysis.expirationDate}</div>
        </Card>

        <Card icon={CreditCard} label="Payment Terms">
          {analysis.paymentTerms}
          {analysis.amounts.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {analysis.amounts.map((a) => (
                <span
                  key={a}
                  className="text-xs px-2 py-0.5 rounded-full bg-gold/20 text-navy font-semibold"
                >
                  {a}
                </span>
              ))}
            </div>
          )}
        </Card>

        <Card icon={XCircle} label="Termination Conditions">
          {analysis.terminationConditions}
        </Card>

        <Card icon={Lock} label="Confidentiality">
          {analysis.confidentiality}
        </Card>

        <Card icon={Gavel} label="Governing Law">
          {analysis.governingLaw}
        </Card>

        <Card icon={Scale} label="Notice Period">
          {analysis.noticePeriod}
        </Card>
      </div>

      <div className="card-elevated p-5">
        <div className="flex items-center gap-2 mb-3">
          <ListChecks className="w-5 h-5 text-royal" />
          <h3 className="font-display font-semibold text-navy">Key Obligations</h3>
        </div>
        <ul className="grid md:grid-cols-2 gap-2">
          {analysis.keyObligations.map((o) => (
            <li
              key={o}
              className="flex items-start gap-2 text-sm bg-secondary rounded-md p-3 border border-border"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 shrink-0" />
              <span className="text-navy">{o}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
