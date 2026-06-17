import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Upload,
  FileText,
  ShieldAlert,
  FileBarChart,
  MessageSquare,
  Menu,
  Scale,
  CheckCircle2,
} from "lucide-react";
import { useContract } from "@/lib/contract/store";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/upload", label: "Upload Contract", icon: Upload },
  { to: "/summary", label: "Summary", icon: FileText },
  { to: "/risk", label: "Risk Analysis", icon: ShieldAlert },
  { to: "/report", label: "Executive Report", icon: FileBarChart },
  { to: "/chat", label: "AI Chat", icon: MessageSquare },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { fileName, isDemo } = useContract();

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <aside
        className={`${open ? "w-64" : "w-16"} transition-all duration-300 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col`}
      >
        <div className="h-16 flex items-center gap-2 px-4 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-lg gradient-gold flex items-center justify-center text-navy shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          {open && (
            <div className="overflow-hidden">
              <div className="font-display font-bold text-sm leading-tight whitespace-nowrap">
                LegalShield AI
              </div>
              <div className="text-[10px] text-sidebar-foreground/60 whitespace-nowrap">
                Contract Intelligence
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 py-3 px-2 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-white font-medium"
                    : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {open && <span className="whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {open && (
          <div className="p-3 border-t border-sidebar-border">
            <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 mb-1">
              Active Contract
            </div>
            {fileName ? (
              <div className="text-xs">
                <div className="flex items-center gap-1.5 text-gold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span className="font-medium">{isDemo ? "Demo loaded" : "Loaded"}</span>
                </div>
                <div className="truncate text-sidebar-foreground/70 mt-0.5" title={fileName}>
                  {fileName}
                </div>
              </div>
            ) : (
              <div className="text-xs text-sidebar-foreground/60">No contract uploaded</div>
            )}
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card flex items-center px-6 gap-4 sticky top-0 z-10">
          <button
            onClick={() => setOpen((o) => !o)}
            className="p-2 rounded-md hover:bg-muted text-muted-foreground"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Enterprise Workspace</div>
            <div className="font-display font-semibold">
              {nav.find((n) => n.to === pathname)?.label || "LegalShield AI"}
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground font-medium">
              v1.0 · Hackathon Build
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
