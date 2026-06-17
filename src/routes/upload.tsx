import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Upload, FileText, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { useContract } from "@/lib/contract/store";
import { extractPdfText } from "@/lib/contract/pdf";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload Contract — LegalShield AI" },
      { name: "description", content: "Upload a PDF contract for instant AI-powered analysis." },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const { loadContract, loadDemo, fileName, isDemo } = useContract();
  const navigate = useNavigate();
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }
    setLoading(true);
    try {
      const text = await extractPdfText(file);
      if (text.trim().length < 50) {
        toast.error("Could not extract enough text. Try another PDF.");
        setLoading(false);
        return;
      }
      loadContract(file.name, text, false);
      toast.success("Contract analyzed successfully", {
        description: `${file.name} · ${(file.size / 1024).toFixed(1)} KB`,
      });
      setTimeout(() => navigate({ to: "/" }), 600);
    } catch (e) {
      console.error(e);
      toast.error("Failed to parse PDF. Try the demo contract instead.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy">Upload Contract</h1>
        <p className="text-muted-foreground text-sm">
          Drop a PDF below. All processing happens in your browser — nothing is uploaded.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={`card-elevated p-12 border-2 border-dashed cursor-pointer transition-all ${
          dragOver ? "border-royal bg-secondary" : "border-border"
        } hover:border-royal hover:bg-secondary/50`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl gradient-navy text-gold flex items-center justify-center mb-4">
            {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
          </div>
          <div className="text-lg font-display font-semibold text-navy">
            {loading ? "Parsing PDF…" : "Drag & drop your contract"}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            or click to browse · PDF only · max 25 MB
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <button
          onClick={() => {
            loadDemo();
            toast.success("Demo contract loaded", { description: "Master Services Agreement" });
            setTimeout(() => navigate({ to: "/" }), 400);
          }}
          className="card-elevated p-5 text-left hover:border-gold transition group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gold text-navy flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="font-display font-semibold text-navy">Try Demo Contract</div>
          </div>
          <p className="text-sm text-muted-foreground">
            Load a realistic Master Services Agreement and explore the full pipeline instantly.
          </p>
        </button>

        <div className="card-elevated p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg gradient-navy text-gold flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div className="font-display font-semibold text-navy">Currently Loaded</div>
          </div>
          {fileName ? (
            <div>
              <div className="flex items-center gap-2 text-success text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                {isDemo ? "Demo contract" : "Your contract"}
              </div>
              <div className="text-sm text-muted-foreground mt-1 truncate">{fileName}</div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No contract loaded yet.</p>
          )}
        </div>
      </div>

      <div className="card-elevated p-5">
        <h3 className="font-display font-semibold text-navy mb-3">Supported Contract Types</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
          {[
            "Master Services Agreements",
            "Non-Disclosure Agreements",
            "Employment Agreements",
            "Vendor Contracts",
            "Lease Agreements",
            "License Agreements",
          ].map((t) => (
            <div key={t} className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
