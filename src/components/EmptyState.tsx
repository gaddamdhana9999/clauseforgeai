import { Link } from "@tanstack/react-router";
import { FileQuestion, Upload, Sparkles } from "lucide-react";
import { useContract } from "@/lib/contract/store";

export function EmptyState({ title, description }: { title: string; description: string }) {
  const { loadDemo } = useContract();
  return (
    <div className="card-elevated p-12 flex flex-col items-center text-center max-w-2xl mx-auto mt-12">
      <div className="w-16 h-16 rounded-2xl gradient-navy flex items-center justify-center text-gold mb-5">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-display font-bold text-navy mb-2">{title}</h2>
      <p className="text-muted-foreground text-sm mb-6 max-w-md">{description}</p>
      <div className="flex gap-3">
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md gradient-navy text-white text-sm font-medium hover:opacity-90 transition"
        >
          <Upload className="w-4 h-4" />
          Upload Contract
        </Link>
        <button
          onClick={loadDemo}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-gold text-navy text-sm font-medium hover:opacity-90 transition"
        >
          <Sparkles className="w-4 h-4" />
          Load Demo Contract
        </button>
      </div>
    </div>
  );
}
