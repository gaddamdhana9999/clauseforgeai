import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { analyzeContract, type ContractAnalysis } from "./analyzer";
import {
  DEMO_CONTRACT_NAME,
  DEMO_CONTRACT_TEXT,
  DEMO_CONTRACT_B_NAME,
  DEMO_CONTRACT_B_TEXT,
} from "./demo";

interface ContractState {
  fileName: string | null;
  text: string | null;
  analysis: ContractAnalysis | null;
  uploadedAt: Date | null;
  isDemo: boolean;
  compareFileName: string | null;
  compareText: string | null;
  compareAnalysis: ContractAnalysis | null;
  loadContract: (fileName: string, text: string, isDemo?: boolean) => void;
  loadDemo: () => void;
  loadCompare: (fileName: string, text: string) => void;
  loadCompareDemo: () => void;
  reset: () => void;
}

const Ctx = createContext<ContractState | null>(null);

export function ContractProvider({ children }: { children: ReactNode }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [uploadedAt, setUploadedAt] = useState<Date | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [compareFileName, setCompareFileName] = useState<string | null>(null);
  const [compareText, setCompareText] = useState<string | null>(null);

  // Auto-load demo on first mount so every page is functional for the demo.
  useEffect(() => {
    setFileName((prev) => prev ?? DEMO_CONTRACT_NAME);
    setText((prev) => prev ?? DEMO_CONTRACT_TEXT);
    setUploadedAt((prev) => prev ?? new Date());
    setIsDemo((prev) => (prev ? prev : true));
  }, []);

  const analysis = useMemo(() => (text ? analyzeContract(text) : null), [text]);
  const compareAnalysis = useMemo(
    () => (compareText ? analyzeContract(compareText) : null),
    [compareText],
  );

  const value: ContractState = {
    fileName,
    text,
    analysis,
    uploadedAt,
    isDemo,
    compareFileName,
    compareText,
    compareAnalysis,
    loadContract: (name, t, demo = false) => {
      setFileName(name);
      setText(t);
      setUploadedAt(new Date());
      setIsDemo(demo);
    },
    loadDemo: () => {
      setFileName(DEMO_CONTRACT_NAME);
      setText(DEMO_CONTRACT_TEXT);
      setUploadedAt(new Date());
      setIsDemo(true);
    },
    loadCompare: (name, t) => {
      setCompareFileName(name);
      setCompareText(t);
    },
    loadCompareDemo: () => {
      setCompareFileName(DEMO_CONTRACT_B_NAME);
      setCompareText(DEMO_CONTRACT_B_TEXT);
    },
    reset: () => {
      setFileName(null);
      setText(null);
      setUploadedAt(null);
      setIsDemo(false);
      setCompareFileName(null);
      setCompareText(null);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useContract() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useContract must be used inside ContractProvider");
  return v;
}
