import { createFileRoute, Link } from "@tanstack/react-router";
import { useContract } from "@/lib/contract/store";
import { EmptyState } from "@/components/EmptyState";
import {
  FileText,
  Layers,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  Info,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  RadialBarChart,
  RadialBar,
  Legend,
} from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — LegalShield AI" },
      { name: "description", content: "Contract intelligence dashboard with KPIs and analytics." },
    ],
  }),
  component: Dashboard,
});

const COLORS = {
  high: "#DC2626",
  medium: "#F59E0B",
  low: "#16A34A",
  navy: "#071B34",
  royal: "#0D47A1",
  gold: "#F4B942",
};

function Kpi({
  label,
  value,
  icon: Icon,
  tone = "navy",
  sub,
}: {
  label: string;
  value: string | number;
  icon: any;
  tone?: "navy" | "gold" | "danger" | "warn" | "success";
  sub?: string;
}) {
  const toneClass = {
    navy: "bg-[#071B34] text-gold",
    gold: "bg-gold text-navy",
    danger: "bg-destructive text-white",
    warn: "bg-warning text-white",
    success: "bg-success text-white",
  }[tone];
  return (
    <div className="card-elevated p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${toneClass}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-display font-bold text-navy">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function Dashboard() {
  const { fileName, analysis } = useContract();

  if (!analysis) {
    return (
      <div>
        <Hero />
        <EmptyState
          title="Welcome to LegalShield AI"
          description="Upload a contract PDF or load the built-in demo to see real-time risk analysis, compliance scoring, and an executive-ready report."
        />
      </div>
    );
  }

  const riskData = [
    { name: "High", value: analysis.highCount, color: COLORS.high },
    { name: "Medium", value: analysis.mediumCount, color: COLORS.medium },
    { name: "Low", value: analysis.lowCount, color: COLORS.low },
  ];

  const categoryData = Object.entries(analysis.categoryCounts).map(([name, value]) => ({
    name,
    value,
  }));

  const compliance = [
    {
      name: "Compliance",
      value: analysis.complianceScore,
      fill: analysis.complianceScore >= 70 ? COLORS.low : COLORS.medium,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card-elevated p-6 gradient-navy text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-gold/90 mb-1">
              Currently Analyzing
            </div>
            <div className="text-xl font-display font-bold truncate max-w-[60ch]">{fileName}</div>
            <div className="text-sm text-white/70 mt-1">{analysis.type}</div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/report"
              className="px-4 py-2 rounded-md bg-gold text-navy text-sm font-medium hover:opacity-90"
            >
              View Executive Report
            </Link>
            <Link
              to="/risk"
              className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-white text-sm font-medium"
            >
              View Risks
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Total Clauses" value={analysis.totalClauses} icon={Layers} tone="navy" />
        <Kpi label="Risk Score" value={`${analysis.riskScore}/100`} icon={TrendingUp} tone="gold" />
        <Kpi
          label="Compliance"
          value={`${analysis.complianceScore}%`}
          icon={ShieldCheck}
          tone="success"
        />
        <Kpi label="Contract Type" value={analysis.type.split(" ")[0]} icon={FileText} tone="navy" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          label="High Risk"
          value={analysis.highCount}
          icon={AlertTriangle}
          tone="danger"
          sub="Critical findings"
        />
        <Kpi
          label="Medium Risk"
          value={analysis.mediumCount}
          icon={AlertCircle}
          tone="warn"
          sub="Requires review"
        />
        <Kpi
          label="Low Risk"
          value={analysis.lowCount}
          icon={ShieldAlert}
          tone="success"
          sub="Acceptable"
        />
        <Kpi label="Parties" value={analysis.parties.length} icon={Info} tone="navy" sub="Counter-parties" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-elevated p-5">
          <h3 className="font-display font-semibold text-navy mb-1">Risk Distribution</h3>
          <p className="text-xs text-muted-foreground mb-4">By severity classification</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={riskData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={4}>
                {riskData.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-around text-xs mt-2">
            {riskData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="font-semibold text-navy">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated p-5">
          <h3 className="font-display font-semibold text-navy mb-1">Clause Categories</h3>
          <p className="text-xs text-muted-foreground mb-4">Topic mentions across contract</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill={COLORS.royal} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card-elevated p-5">
          <h3 className="font-display font-semibold text-navy mb-1">Compliance Status</h3>
          <p className="text-xs text-muted-foreground mb-4">Regulatory readiness</p>
          <ResponsiveContainer width="100%" height={240}>
            <RadialBarChart innerRadius="60%" outerRadius="100%" data={compliance} startAngle={90} endAngle={-270}>
              <RadialBar background dataKey="value" cornerRadius={12} />
              <Legend
                iconSize={0}
                content={() => (
                  <div className="text-center -mt-32">
                    <div className="text-4xl font-display font-bold text-navy">
                      {analysis.complianceScore}%
                    </div>
                    <div className="text-xs text-muted-foreground">Compliant</div>
                  </div>
                )}
              />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <AgentPipeline />
    </div>
  );
}

function Hero() {
  return (
    <div className="card-elevated p-8 gradient-navy text-white mb-6 relative overflow-hidden">
      <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-gold/20 blur-3xl" />
      <div className="relative">
        <div className="inline-block px-3 py-1 rounded-full bg-gold/20 text-gold text-xs font-medium mb-3">
          Enterprise · AI-Powered · Hackathon Build
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
          Contract Intelligence, in Minutes
        </h1>
        <p className="text-white/80 max-w-2xl">
          LegalShield AI combines a multi-agent analysis pipeline with executive reporting to turn
          dense legal contracts into board-ready insights.
        </p>
      </div>
    </div>
  );
}

import { AgentWorkflow } from "@/components/AgentWorkflow";
function AgentPipeline() {
  return <AgentWorkflow compact />;
}
