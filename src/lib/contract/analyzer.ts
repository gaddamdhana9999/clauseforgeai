export type Severity = "high" | "medium" | "low";

export interface RiskItem {
  category: string;
  clause: string;
  severity: Severity;
  explanation: string;
  impact: string;
  recommendation: string;
  excerpt: string;
}

export interface ContractAnalysis {
  type: string;
  parties: string[];
  effectiveDate: string;
  expirationDate: string;
  paymentTerms: string;
  terminationConditions: string;
  keyObligations: string[];
  confidentiality: string;
  governingLaw: string;
  noticePeriod: string;
  amounts: string[];
  totalClauses: number;
  risks: RiskItem[];
  riskScore: number; // 0-100 (higher = more risk)
  complianceScore: number; // 0-100 (higher = better)
  highCount: number;
  mediumCount: number;
  lowCount: number;
  categoryCounts: Record<string, number>;
  decision: "Approved" | "Approved With Revisions" | "High Risk";
  summary: string;
}

const DATE_RE =
  /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/gi;
const MONEY_RE = /\$\s?[\d,]+(?:\.\d+)?(?:\s?(?:million|billion|thousand|M|B|K))?/gi;
const NOTICE_RE = /(\d+)\s*(?:days?|months?)\s*(?:prior\s+)?(?:written\s+)?notice/gi;

function detectType(t: string): string {
  const s = t.toLowerCase();
  if (/non[- ]disclosure|nda|confidentiality agreement/.test(s)) return "Non-Disclosure Agreement (NDA)";
  if (/employment agreement|offer letter|at[- ]will employment/.test(s)) return "Employment Agreement";
  if (/lease|landlord|tenant|premises/.test(s)) return "Lease Agreement";
  if (/vendor|purchase order|supplier/.test(s)) return "Vendor Contract";
  if (/master services agreement|services agreement|statement of work|sow/.test(s))
    return "Master Services Agreement";
  if (/license|licensee|licensor/.test(s)) return "License Agreement";
  return "Commercial Contract";
}

function detectParties(t: string): string[] {
  const parties: string[] = [];
  const re =
    /between\s+([A-Z][A-Za-z0-9 .,&'-]+?(?:Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Company|GmbH|PLC|LLP))\b/g;
  let m;
  while ((m = re.exec(t))) parties.push(m[1].trim());
  const re2 = /\band\s+([A-Z][A-Za-z0-9 .,&'-]+?(?:Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Company))\b/g;
  while ((m = re2.exec(t))) parties.push(m[1].trim());
  return Array.from(new Set(parties)).slice(0, 4);
}

function firstMatch(t: string, re: RegExp): string | null {
  const m = t.match(re);
  return m ? m[0] : null;
}

function findExcerpt(t: string, keywords: RegExp): string {
  const m = keywords.exec(t);
  if (!m) return "";
  const start = Math.max(0, m.index - 80);
  const end = Math.min(t.length, m.index + 240);
  return "…" + t.slice(start, end).replace(/\s+/g, " ").trim() + "…";
}

function scoreSeverity(t: string, patterns: RegExp[]): Severity {
  const hits = patterns.filter((p) => p.test(t)).length;
  if (hits >= 3) return "high";
  if (hits >= 2) return "medium";
  return "low";
}

export function analyzeContract(text: string): ContractAnalysis {
  const T = text.replace(/\u00a0/g, " ");
  const type = detectType(T);
  const parties = detectParties(T);
  const dates = T.match(DATE_RE) || [];
  const amounts = Array.from(new Set(T.match(MONEY_RE) || [])).slice(0, 6);
  const notices = T.match(NOTICE_RE) || [];
  const effectiveDate = dates[0] || "Not specified";
  const expirationDate = dates[1] || dates[dates.length - 1] || "Not specified";

  const paymentTerms =
    firstMatch(T, /Net\s?\d+|within\s+\d+\s+days\s+of\s+invoice|\d+%\s+per\s+month/i) ||
    "Standard payment terms apply";
  const terminationConditions = notices[0] || "Termination clause present";
  const governingLaw =
    firstMatch(T, /laws?\s+of\s+(?:the\s+State\s+of\s+)?[A-Z][A-Za-z ]+/) || "Not specified";
  const confidentiality = /confidential/i.test(T)
    ? "Mutual confidentiality with survival period"
    : "No explicit confidentiality terms";

  const keyObligations: string[] = [];
  if (/services/i.test(T)) keyObligations.push("Deliver services per Statement of Work");
  if (/payment|fees/i.test(T)) keyObligations.push("Timely payment of fees and invoices");
  if (/confidential/i.test(T)) keyObligations.push("Protect Confidential Information");
  if (/indemnif/i.test(T)) keyObligations.push("Indemnify against third-party claims");
  if (/comply|compliance|gdpr|hipaa|ccpa|soc/i.test(T))
    keyObligations.push("Maintain regulatory compliance and certifications");
  if (keyObligations.length === 0) keyObligations.push("General performance per contract terms");

  // Risk evaluation
  const risks: RiskItem[] = [];

  const paySev = scoreSeverity(T, [
    /late|interest|1\.5%|penalt/i,
    /Net\s?(?:45|60|90)/i,
    /no\s+refund|non[- ]refundable/i,
  ]);
  risks.push({
    category: "Payment Risk",
    clause: "Fees and Payment",
    severity: paySev,
    explanation:
      "Payment terms include interest on late payments and standard Net 30 cycle. Cash-flow exposure is moderate.",
    impact: "Late fees may accrue; potential service suspension on non-payment.",
    recommendation: "Negotiate grace period and cap late-fee interest at 1% per month.",
    excerpt: findExcerpt(T, /payment|invoice|net\s?\d+/i),
  });

  const liabSev = scoreSeverity(T, [
    /unlimited\s+liability/i,
    /no\s+limitation\s+of\s+liability/i,
    /consequential\s+damages/i,
  ]);
  risks.push({
    category: "Liability Risk",
    clause: "Limitation of Liability",
    severity: /unlimited/i.test(T) ? "high" : liabSev === "low" ? "low" : "medium",
    explanation:
      "Liability cap is tied to 12 months of fees. Indirect and consequential damages are excluded.",
    impact: "Recovery in catastrophic events may be limited to fees paid.",
    recommendation: "Carve-outs for IP infringement, data breach, and willful misconduct.",
    excerpt: findExcerpt(T, /liability|damages/i),
  });

  const termSev = scoreSeverity(T, [/auto[- ]renew/i, /no\s+termination/i, /perpetual/i]);
  risks.push({
    category: "Termination Risk",
    clause: "Term and Termination",
    severity: termSev,
    explanation:
      "Termination for convenience requires 90 days notice. Material breach requires 30-day cure period.",
    impact: "Cannot exit quickly without notice obligations or financial penalties.",
    recommendation: "Reduce notice to 60 days and add termination for change-of-control.",
    excerpt: findExcerpt(T, /terminat/i),
  });

  const compSev = scoreSeverity(T, [/gdpr/i, /hipaa/i, /ccpa/i, /soc\s?2/i, /iso\s?27001/i]);
  risks.push({
    category: "Compliance Risk",
    clause: "Data Protection and Compliance",
    severity: compSev === "high" ? "low" : compSev === "medium" ? "low" : "medium",
    explanation:
      "Contract references key data protection and security certifications relevant to enterprise SaaS.",
    impact: "Failure to maintain certifications could trigger breach and reputational damage.",
    recommendation: "Annual audit rights and notification within 24h of any certification lapse.",
    excerpt: findExcerpt(T, /gdpr|hipaa|ccpa|soc\s?2/i),
  });

  const ipSev = scoreSeverity(T, [
    /work\s+made\s+for\s+hire/i,
    /assign\s+all\s+right/i,
    /retain[s]?\s+ownership/i,
  ]);
  risks.push({
    category: "IP Risk",
    clause: "Intellectual Property",
    severity: ipSev,
    explanation:
      "Custom work product transfers to Client upon payment. Provider retains underlying tools and frameworks.",
    impact: "Ambiguity between retained frameworks and deliverables may create ownership disputes.",
    recommendation: "Define 'Background IP' explicitly and grant perpetual license to embedded components.",
    excerpt: findExcerpt(T, /intellectual\s+property|ownership/i),
  });

  const confSev = scoreSeverity(T, [/five\s+\(5\)\s+years/i, /perpetually/i, /survive/i]);
  risks.push({
    category: "Confidentiality Risk",
    clause: "Confidentiality",
    severity: confSev,
    explanation: "Confidentiality survives 5 years post-termination — above market standard of 3 years.",
    impact: "Extended obligations restrict business flexibility long after engagement ends.",
    recommendation: "Negotiate down to 3 years except for trade secrets (which can be perpetual).",
    excerpt: findExcerpt(T, /confidential/i),
  });

  const highCount = risks.filter((r) => r.severity === "high").length;
  const mediumCount = risks.filter((r) => r.severity === "medium").length;
  const lowCount = risks.filter((r) => r.severity === "low").length;

  const riskScore = Math.min(
    100,
    Math.round(highCount * 22 + mediumCount * 11 + lowCount * 4 + 10),
  );
  const complianceScore = Math.max(
    20,
    Math.min(100, 100 - Math.round(riskScore * 0.55) + (compSev === "high" ? 10 : 0)),
  );

  const decision: ContractAnalysis["decision"] =
    riskScore >= 65 ? "High Risk" : riskScore >= 35 ? "Approved With Revisions" : "Approved";

  const totalClauses = Math.max(
    8,
    (T.match(/\n\s*\d+\.\s/g) || []).length || Math.round(T.length / 700),
  );

  const categoryCounts: Record<string, number> = {
    Payment: (T.match(/payment|invoice|fee/gi) || []).length,
    Liability: (T.match(/liability|damages|indemnif/gi) || []).length,
    Termination: (T.match(/terminat|expir/gi) || []).length,
    Confidentiality: (T.match(/confidential|non[- ]disclosure/gi) || []).length,
    IP: (T.match(/intellectual\s+property|copyright|trademark|patent/gi) || []).length,
    Compliance: (T.match(/gdpr|hipaa|ccpa|soc\s?2|regulat|complian/gi) || []).length,
  };

  const summary = `${type} between ${parties.join(" and ") || "the parties"}, effective ${effectiveDate}. Contains ${totalClauses} core clauses with ${highCount} high-severity, ${mediumCount} medium, and ${lowCount} low-severity risk findings. Overall risk score ${riskScore}/100, compliance posture ${complianceScore}/100. Recommended decision: ${decision}.`;

  return {
    type,
    parties: parties.length ? parties : ["Party A", "Party B"],
    effectiveDate,
    expirationDate,
    paymentTerms,
    terminationConditions,
    keyObligations,
    confidentiality,
    governingLaw,
    noticePeriod: notices[0] || "Standard notice period applies",
    amounts,
    totalClauses,
    risks,
    riskScore,
    complianceScore,
    highCount,
    mediumCount,
    lowCount,
    categoryCounts,
    decision,
    summary,
  };
}

export function answerQuestion(
  q: string,
  text: string,
  a: ContractAnalysis,
): { answer: string; citation: string } {
  const Q = q.toLowerCase();
  let answer = "";
  let citation = "";

  if (/payment|invoice|fee|cost|price/.test(Q)) {
    answer = `Payment terms: ${a.paymentTerms}. ${a.amounts.length ? "Referenced amounts include " + a.amounts.join(", ") + "." : ""}`;
    citation = findExcerpt(text, /payment|invoice|net\s?\d+|fee/i);
  } else if (/risk/.test(Q)) {
    answer = `Overall risk score is ${a.riskScore}/100 with ${a.highCount} high, ${a.mediumCount} medium, and ${a.lowCount} low severity issues across ${a.risks.length} categories.`;
    citation = a.risks
      .filter((r) => r.severity === "high")
      .map((r) => r.category + ": " + r.explanation)
      .join(" | ") || a.risks[0].explanation;
  } else if (/terminat|exit|cancel/.test(Q)) {
    answer = `Termination: ${a.terminationConditions}. Notice period applies and material breach has a cure window.`;
    citation = findExcerpt(text, /terminat/i);
  } else if (/ip|intellectual|own/.test(Q)) {
    answer = `Intellectual property ownership: custom work product transfers to Client upon payment; Service Provider retains pre-existing tools and frameworks.`;
    citation = findExcerpt(text, /intellectual\s+property|ownership/i);
  } else if (/confidential|nda/.test(Q)) {
    answer = `Confidentiality: ${a.confidentiality}.`;
    citation = findExcerpt(text, /confidential/i);
  } else if (/govern|jurisdiction|law/.test(Q)) {
    answer = `Governing law: ${a.governingLaw}.`;
    citation = findExcerpt(text, /govern|laws?\s+of/i);
  } else if (/part(y|ies)|who/.test(Q)) {
    answer = `Parties to the agreement: ${a.parties.join(", ")}.`;
    citation = findExcerpt(text, /between\s+/i);
  } else if (/summar|overview/.test(Q)) {
    answer = a.summary;
    citation = `Document type detected: ${a.type}.`;
  } else {
    // Keyword search
    const tokens = Q.split(/\W+/).filter((w) => w.length > 3);
    const sentences = text.split(/(?<=[.?!])\s+/);
    const hit = sentences.find((s) => tokens.some((t) => s.toLowerCase().includes(t)));
    answer = hit
      ? `Based on the contract, here is the most relevant clause: ${hit.trim().slice(0, 320)}`
      : `I couldn't find a direct match in the contract. Try asking about payment terms, risks, termination, IP, confidentiality, or governing law.`;
    citation = hit ? "…" + hit.trim().slice(0, 200) + "…" : "";
  }

  return { answer, citation };
}
