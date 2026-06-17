import { createFileRoute } from "@tanstack/react-router";
import { useContract } from "@/lib/contract/store";
import { EmptyState } from "@/components/EmptyState";
import { answerQuestion } from "@/lib/contract/analyzer";
import { useRef, useState, useEffect } from "react";
import { Send, Sparkles, Bot, User, Quote } from "lucide-react";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "AI Chat — LegalShield AI" },
      { name: "description", content: "Conversational assistant for your uploaded contract." },
    ],
  }),
  component: ChatPage,
});

interface Msg {
  role: "user" | "ai";
  text: string;
  citation?: string;
}

const SUGGESTIONS = [
  "What are the payment terms?",
  "What risks exist?",
  "What termination clauses exist?",
  "Who owns the IP?",
  "Summarize the contract",
];

function ChatPage() {
  const { text, analysis } = useContract();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!analysis || !text) {
    return (
      <EmptyState
        title="No contract loaded"
        description="Upload a contract or load the demo to chat with the LegalShield assistant."
      />
    );
  }

  function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    const { answer, citation } = answerQuestion(trimmed, text!, analysis!);
    setMessages((m) => [...m, { role: "user", text: trimmed }, { role: "ai", text: answer, citation }]);
    setInput("");
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-7rem)] animate-fade-in">
      <div className="card-elevated p-4 mb-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg gradient-navy text-gold flex items-center justify-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <div className="font-display font-semibold text-navy">LegalShield Assistant</div>
          <div className="text-xs text-muted-foreground">Grounded in your uploaded contract</div>
        </div>
      </div>

      <div className="flex-1 card-elevated p-5 overflow-y-auto space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="w-10 h-10 mx-auto text-royal mb-3" />
            <p className="text-sm text-muted-foreground mb-4">Ask anything about the contract</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="text-xs px-3 py-1.5 rounded-full bg-secondary border border-border hover:border-royal text-navy"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${
                m.role === "user" ? "bg-gold text-navy" : "gradient-navy text-gold"
              }`}
            >
              {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`max-w-[80%] ${m.role === "user" ? "text-right" : ""}`}>
              <div
                className={`inline-block px-4 py-2.5 rounded-2xl text-sm ${
                  m.role === "user"
                    ? "bg-royal text-white rounded-tr-sm"
                    : "bg-secondary text-navy rounded-tl-sm"
                }`}
              >
                {m.text}
              </div>
              {m.citation && (
                <div className="mt-2 text-[11px] text-muted-foreground bg-card border-l-2 border-gold p-2 rounded flex gap-2 items-start text-left">
                  <Quote className="w-3 h-3 text-gold shrink-0 mt-0.5" />
                  <span className="italic">{m.citation}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about payment terms, risks, IP, termination…"
          className="flex-1 px-4 py-3 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-royal"
        />
        <button
          type="submit"
          className="px-5 rounded-md gradient-navy text-white font-medium text-sm hover:opacity-90 flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          Send
        </button>
      </form>
    </div>
  );
}
