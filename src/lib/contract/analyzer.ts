export type Severity = "high" | "medium" | "low";

export interface SourceCitation {
  clauseNumber: string; // e.g. "3" or "—" if outside a numbered clause
  heading: string; // e.g. "FEES AND PAYMENT"
  excerpt: string; // verbatim snippet from the contract
}

export interface RiskItem {
  category: string;
  clause: string;
  severity: Severity;
  explanation: string;
  impact: string;
  recommendation: string;
  excerpt: string;
  source: SourceCitation;
  evidence: string[]; // bullet-list of literal patterns found in the clause
}

export type ClauseCategory =
  | "Payment Terms"
  | "Termination"
  | "Confidentiality"
  | "Intellectual Property"
  | "Governing Law"
  | "Liability"
  | "Compliance"
  | "Indemnification"
  | "Assignment"
  | "Warranties"
  | "Force Majeure"
  | "Services"
  | "Dispute Resolution"
  | "General";

export interface ParsedClause {
  number: string;
  heading: string;
  body: string;
  category: ClauseCategory;
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
  clauses: ParsedClause[];
  clauseCategories: ClauseCategory[];
  risks: RiskItem[];
  riskScore: number;
  complianceScore: number;
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

/* ---------------- Clause parsing ---------------- */

const CATEGORY_RULES: { category: ClauseCategory; patterns: RegExp[] }[] = [
  { category: "Payment Terms", patterns: [/\b(payment|fees?|invoice|net\s?\d+|compensation|pricing|billing)\b/i] },
  { category: "Termination", patterns: [/\b(terminat|termination|expiration|renewal|term and|notice of non-?renewal)\b/i] },
  { category: "Confidentiality", patterns: [/\b(confidential|non[- ]disclosure|nda|proprietary information|trade secret)\b/i] },
  { category: "Intellectual Property", patterns: [/\b(intellectual\s+property|\bip\b|work\s+product|ownership|copyright|patent|trademark|work\s+made\s+for\s+hire)\b/i] },
  { category: "Governing Law", patterns: [/\b(governing\s+law|jurisdiction|choice\s+of\s+law|venue)\b/i] },
  { category: "Dispute Resolution", patterns: [/\b(arbitration|mediation|dispute\s+resolution|binding\s+arbitration)\b/i] },
  { category: "Liability", patterns: [/\b(limitation\s+of\s+liability|liability|damages|consequential)\b/i] },
  { category: "Indemnification", patterns: [/\b(indemnif|hold\s+harmless)\b/i] },
  { category: "Compliance", patterns: [/\b(gdpr|hipaa|ccpa|soc\s?2|iso\s?27001|data\s+protection|compliance|regulatory|security)\b/i] },
  { category: "Assignment", patterns: [/\b(assign|assignment|successors and assigns|change\s+of\s+control)\b/i] },
  { category: "Warranties", patterns: [/\b(warrant(y|ies)|disclaim|as\s+is)\b/i] },
  { category: "Force Majeure", patterns: [/\b(force\s+majeure|acts?\s+of\s+god|beyond\s+(?:reasonable\s+)?control)\b/i] },
  { category: "Services", patterns: [/\b(services|statement\s+of\s+work|sow|scope\s+of\s+work|deliverables)\b/i] },
];

function categorize(heading: string, body: string): ClauseCategory {
  const hayHeading = heading.toLowerCase();
  const hayBody = body.toLowerCase();
  // Prefer heading match (stronger signal)
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((p) => p.test(hayHeading))) return rule.category;
  }
  // Score body matches across all categories and pick best
  let best: { category: ClauseCategory; score: number } = { category: "General", score: 0 };
  for (const rule of CATEGORY_RULES) {
    let score = 0;
    for (const p of rule.patterns) {
      const m = hayBody.match(new RegExp(p.source, "gi"));
      if (m) score += m.length;
    }
    if (score > best.score) best = { category: rule.category, score };
  }
  return best.category;
}

export function parseClauses(text: string): ParsedClause[] {
  const T = text.replace(/\r/g, "");
  const matches: { num: string; heading: string; index: number }[] = [];

  // Heading patterns (tried in order; overlapping matches deduped by index)
  const patterns: RegExp[] = [
    // "1. HEADING" or "12. HEADING" on its own line (ALL CAPS heading)
    /(^|\n)\s*(\d{1,2})\.\s+([A-Z][A-Z0-9 ,&/'\-]{2,80})(?=\n)/g,
    // "1.1 Heading" or "1.1. Heading" (mixed case)
    /(^|\n)\s*(\d{1,2}\.\d{1,2})\.?\s+([A-Z][A-Za-z0-9 ,&/'\-]{2,80})(?=\n)/g,
    // "Section 1. Heading" / "Article 1. Heading" / "Clause 1. Heading"
    /(^|\n)\s*(?:Section|Article|Clause)\s+(\d{1,2}(?:\.\d{1,2})?)\.?\s*[—:\-]?\s*([A-Z][A-Za-z0-9 ,&/'\-]{2,80})(?=\n)/g,
    // Standalone ALL CAPS heading line (no leading number) — at least 2 words
    /(^|\n)()([A-Z][A-Z0-9 ,&/'\-]{4,80}(?:\s+[A-Z][A-Z0-9 ,&/'\-]{1,40}){0,6})(?=\n[A-Z])/g,
  ];

  for (const re of patterns) {
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(T))) {
      const idx = m.index + m[1].length;
      // Skip if heading is a contract-wide title like "MASTER SERVICES AGREEMENT" near top
      if (m[3].trim().length < 3) continue;
      matches.push({ num: m[2] || "", heading: m[3].trim(), index: idx });
    }
  }

  // Dedupe by index, sort by position
  const seen = new Set<number>();
  const sorted = matches
    .sort((a, b) => a.index - b.index)
    .filter((x) => {
      if (seen.has(x.index)) return false;
      seen.add(x.index);
      return true;
    });

  if (sorted.length === 0) {
    // Fallback: split on blank lines
    return T.split(/\n{2,}/)
      .map((chunk, i) => {
        const first = chunk.trim().split("\n")[0] || "";
        const heading = first.slice(0, 60);
        const body = chunk.trim();
        return {
          number: String(i + 1),
          heading: heading.toUpperCase(),
          body,
          category: categorize(heading, body),
        };
      })
      .filter((c) => c.body.length > 40);
  }

  // Assign auto-numbers to headings without numbers, in document order
  let autoNum = 0;
  const out: ParsedClause[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const start = cur.index;
    const end = i + 1 < sorted.length ? sorted[i + 1].index : T.length;
    const block = T.slice(start, end).trim();
    // Strip the heading line from the body
    const headingLine = block.split("\n")[0];
    const body = block.slice(headingLine.length).trim();
    if (body.length < 20) continue; // skip thin/false headings (e.g. preamble titles)
    autoNum += 1;
    const number = cur.num || String(autoNum);
    out.push({
      number,
      heading: cur.heading.replace(/\s{2,}/g, " "),
      body,
      category: categorize(cur.heading, body),
    });
  }
  return out;
}

function findClause(
  clauses: ParsedClause[],
  patterns: RegExp[],
): ParsedClause | null {
  for (const c of clauses) {
    const hay = (c.heading + "\n" + c.body).toLowerCase();
    if (patterns.some((p) => p.test(hay))) return c;
  }
  return null;
}

function snippet(body: string, around?: RegExp, max = 280): string {
  const clean = body.replace(/\s+/g, " ").trim();
  if (!around) return clean.slice(0, max) + (clean.length > max ? "…" : "");
  const m = around.exec(clean);
  if (!m) return clean.slice(0, max) + (clean.length > max ? "…" : "");
  const start = Math.max(0, m.index - 60);
  const end = Math.min(clean.length, m.index + max - 60);
  return (start > 0 ? "…" : "") + clean.slice(start, end) + (end < clean.length ? "…" : "");
}

function cite(c: ParsedClause, around?: RegExp): SourceCitation {
  return {
    clauseNumber: c.number,
    heading: c.heading,
    excerpt: snippet(c.body, around),
  };
}

/* ---------------- Header detection ---------------- */

function detectType(t: string, clauses: ParsedClause[]): string {
  const s = t.toLowerCase();
  const headings = clauses.map((c) => c.heading.toLowerCase()).join(" ");
  if (/non[- ]disclosure|\bnda\b|confidentiality agreement/.test(s)) return "Non-Disclosure Agreement (NDA)";
  if (/employment agreement|offer letter|at[- ]will employment/.test(s)) return "Employment Agreement";
  if (/lease|landlord|tenant|premises/.test(s)) return "Lease Agreement";
  if (/vendor|purchase order|supplier/.test(s)) return "Vendor Contract";
  if (/master services agreement|services agreement|\bsow\b|statement of work/.test(s) || /services/.test(headings))
    return "Master Services Agreement";
  if (/license|licensee|licensor/.test(s)) return "License Agreement";
  return "Commercial Contract";
}

function detectParties(t: string): string[] {
  const parties: string[] = [];
  const re =
    /(?:between|and)\s+([A-Z][A-Za-z0-9 .,&'\-]+?(?:Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Company|GmbH|PLC|LLP|Holdings))\b/g;
  let m;
  while ((m = re.exec(t))) parties.push(m[1].trim().replace(/,$/, ""));
  return Array.from(new Set(parties)).slice(0, 4);
}

/* ---------------- Severity helpers ---------------- */

function sev(hi: boolean, mid: boolean): Severity {
  if (hi) return "high";
  if (mid) return "medium";
  return "low";
}

/* ---------------- Per-category builders ---------------- */

type Builder = (clauses: ParsedClause[], full: string) => RiskItem | null;

const buildPayment: Builder = (clauses) => {
  const c = findClause(clauses, [/payment|invoice|fees?|net\s?\d+|late/]);
  if (!c) return null;
  const body = c.body;
  const net = body.match(/Net\s?(\d{1,3})|within\s+(\d{1,3})\s+days\s+of\s+invoice/i);
  const netDays = net ? Number(net[1] || net[2]) : null;
  const interest = body.match(/(\d+(?:\.\d+)?)\s?%\s+per\s+month/i);
  const rate = interest ? Number(interest[1]) : null;
  const nonRefund = /non[- ]refundable|no\s+refund/i.test(body);
  const evidence: string[] = [];
  if (netDays) evidence.push(`Net ${netDays} payment cycle`);
  if (rate) evidence.push(`Late interest at ${rate}% per month`);
  if (nonRefund) evidence.push("Fees are non-refundable");
  const high = (netDays !== null && netDays >= 60) || (rate !== null && rate >= 2) || nonRefund;
  const mid = (netDays !== null && netDays >= 45) || (rate !== null && rate >= 1.5);
  const severity = sev(high, mid);
  const explanation =
    `Clause ${c.number} sets ${netDays ? `Net ${netDays}` : "the payment cycle"}` +
    `${rate ? ` with ${rate}% monthly late interest` : ""}` +
    `${nonRefund ? " and makes all fees non-refundable" : ""}.`;
  const impact =
    severity === "high"
      ? "Working-capital exposure is material — long collection cycles and high penalty interest compound quickly."
      : severity === "medium"
        ? "Cash-flow exposure is moderate; late payments will trigger meaningful interest."
        : "Standard commercial payment terms with limited exposure.";
  const recParts: string[] = [];
  if (netDays && netDays >= 45) recParts.push(`shorten to Net 30 or add a 15-day grace period before interest accrues`);
  if (rate && rate >= 1.5) recParts.push(`cap late-fee interest at 1.0% per month`);
  if (nonRefund) recParts.push(`add pro-rata refund for terminated services`);
  if (recParts.length === 0) recParts.push(`add explicit dispute window before late interest applies`);
  return {
    category: "Payment Risk",
    clause: `Clause ${c.number}. ${c.heading}`,
    severity,
    explanation,
    impact,
    recommendation: `Redline ${c.heading.toLowerCase()}: ${recParts.join("; ")}.`,
    excerpt: snippet(body, /payment|net\s?\d+|invoice/i),
    source: cite(c, /payment|net\s?\d+|invoice|late/i),
    evidence,
  };
};

const buildLiability: Builder = (clauses) => {
  const c = findClause(clauses, [/liability|damages|indemnif/]);
  if (!c) return null;
  const body = c.body;
  const unlimited = /unlimited\s+liability/i.test(body);
  const capMonths = body.match(/(?:twelve|24|12|three|3|six|6)\s*\(?(\d{1,2})\)?\s*months?/i);
  const capFees = /exceed\s+the\s+fees\s+paid/i.test(body);
  const excludesConseq = /(?:indirect|incidental|consequential)\s+damages/i.test(body);
  const evidence: string[] = [];
  if (unlimited) evidence.push("Unlimited liability language present");
  if (capMonths) evidence.push(`Liability cap tied to ${capMonths[1]} months of fees`);
  else if (capFees) evidence.push("Liability cap tied to fees paid");
  if (excludesConseq) evidence.push("Excludes indirect / consequential damages");
  const months = capMonths ? Number(capMonths[1]) : null;
  const high = unlimited || (months !== null && months <= 6);
  const mid = months !== null && months <= 12;
  const severity = sev(high, mid);
  const explanation =
    unlimited
      ? `Clause ${c.number} contains unlimited-liability language for at least one party.`
      : months
        ? `Clause ${c.number} caps aggregate liability at ${months} months of fees paid.`
        : `Clause ${c.number} limits liability but does not state an explicit dollar floor.`;
  const impact =
    severity === "high"
      ? "Recovery in a catastrophic event may be negligible relative to potential loss, or exposure may be uncapped."
      : "Recovery is bounded; carve-outs for severe events may be missing.";
  return {
    category: "Liability Risk",
    clause: `Clause ${c.number}. ${c.heading}`,
    severity,
    explanation,
    impact,
    recommendation: `In clause ${c.number}, add explicit carve-outs (IP infringement, confidentiality breach, gross negligence, willful misconduct) and raise the cap to the greater of 24 months of fees or a fixed super-cap.`,
    excerpt: snippet(body, /liability|damages|cap/i),
    source: cite(c, /liability|damages|cap/i),
    evidence,
  };
};

const buildTermination: Builder = (clauses) => {
  const c = findClause(clauses, [/terminat|term and|renewal/]);
  if (!c) return null;
  const body = c.body;
  const notice = body.match(/(\d{1,3})\s*(?:\(\d+\))?\s*days?\s*(?:prior\s+)?(?:written\s+)?notice/i);
  const cure = body.match(/(\d{1,3})\s*(?:\(\d+\))?\s*days?\s+(?:following|to)\s+(?:written\s+)?(?:notice|cure)/i);
  const autoRenew = /automatically\s+renew|auto[- ]?renew/i.test(body);
  const noConv = /termination\s+for\s+convenience\s+is\s+not\s+permitted/i.test(body);
  const noticeDays = notice ? Number(notice[1]) : null;
  const evidence: string[] = [];
  if (noticeDays) evidence.push(`${noticeDays}-day notice for termination`);
  if (cure) evidence.push(`${cure[1]}-day cure window for material breach`);
  if (autoRenew) evidence.push("Auto-renewal provision present");
  if (noConv) evidence.push("Termination for convenience is prohibited");
  const high = noConv || (noticeDays !== null && noticeDays >= 120) || autoRenew;
  const mid = noticeDays !== null && noticeDays >= 90;
  const severity = sev(high, mid);
  const explanation =
    `Clause ${c.number} ` +
    (noConv ? "prohibits termination for convenience during the initial term" : noticeDays ? `requires ${noticeDays} days written notice to terminate for convenience` : "defines the termination mechanics") +
    (autoRenew ? " and auto-renews unless non-renewal notice is given" : "") +
    (cure ? `; material breach has a ${cure[1]}-day cure period` : "") +
    ".";
  const impact =
    severity === "high"
      ? "Exit flexibility is severely constrained — the buyer may be locked in regardless of business conditions."
      : "Exit is possible but requires meaningful lead time.";
  const recParts: string[] = [];
  if (noConv) recParts.push("introduce a termination-for-convenience right after month 12");
  if (noticeDays && noticeDays > 60) recParts.push("reduce notice to 60 days");
  if (autoRenew) recParts.push("change auto-renewal to opt-in (affirmative consent)");
  recParts.push("add change-of-control termination right");
  return {
    category: "Termination Risk",
    clause: `Clause ${c.number}. ${c.heading}`,
    severity,
    explanation,
    impact,
    recommendation: `In clause ${c.number}: ${recParts.join("; ")}.`,
    excerpt: snippet(body, /terminat|notice|renew/i),
    source: cite(c, /terminat|notice|renew/i),
    evidence,
  };
};

const buildConfidentiality: Builder = (clauses) => {
  const c = findClause(clauses, [/confidential/]);
  if (!c) return null;
  const body = c.body;
  const yrs = body.match(/(?:for\s+a\s+period\s+of\s+|survive[s]?\s+(?:termination\s+)?(?:for\s+)?)(?:\w+\s+)?\(?(\d{1,2})\)?\s*years?/i);
  const perpetual = /perpetual|perpetually|so long as/i.test(body);
  const years = yrs ? Number(yrs[1]) : null;
  const evidence: string[] = [];
  if (years) evidence.push(`Confidentiality survives ${years} years post-termination`);
  if (perpetual) evidence.push("Perpetual obligations for some categories (e.g. trade secrets)");
  const high = perpetual && !/trade\s+secret/i.test(body) ? true : years !== null && years >= 7;
  const mid = years !== null && years >= 5;
  const severity = sev(high, mid);
  const explanation =
    years
      ? `Clause ${c.number} extends confidentiality obligations for ${years} years post-termination${perpetual ? ", with perpetual treatment for trade secrets" : ""}.`
      : `Clause ${c.number} contains confidentiality obligations without a clearly bounded survival period.`;
  return {
    category: "Confidentiality Risk",
    clause: `Clause ${c.number}. ${c.heading}`,
    severity,
    explanation,
    impact:
      severity === "low"
        ? "Confidentiality scope appears aligned with market norms."
        : "Long survival period restricts internal reuse of skills/processes well after the engagement ends.",
    recommendation: `In clause ${c.number}, cap general Confidential Information at 3 years post-termination; preserve perpetual treatment only for genuine trade secrets.`,
    excerpt: snippet(body, /confidential|survive|years?/i),
    source: cite(c, /confidential|survive|years?/i),
    evidence,
  };
};

const buildIP: Builder = (clauses) => {
  const c = findClause(clauses, [/intellectual\s+property|work\s+product|ownership/]);
  if (!c) return null;
  const body = c.body;
  const wfh = /work\s+made\s+for\s+hire/i.test(body);
  const upon = /upon\s+(?:full\s+)?payment/i.test(body);
  const retainsAll = /retains?\s+ownership\s+of\s+all\s+work\s+product/i.test(body);
  const license = body.match(/(non[- ]exclusive|exclusive)[^.]{0,40}license/i);
  const revocable = /revocable\s+license/i.test(body);
  const evidence: string[] = [];
  if (wfh) evidence.push("Custom deliverables treated as work-made-for-hire");
  if (upon) evidence.push("Ownership transfers upon full payment");
  if (retainsAll) evidence.push("Provider retains ownership of all work product");
  if (license) evidence.push(`${license[1]} license to Client`);
  if (revocable) evidence.push("License is revocable");
  const high = retainsAll || revocable;
  const mid = !wfh && !upon;
  const severity = sev(high, mid);
  const explanation = retainsAll
    ? `Clause ${c.number} keeps all work-product ownership with the Service Provider and grants only a license.`
    : wfh
      ? `Clause ${c.number} assigns custom deliverables to the Client as work-for-hire upon payment; Provider retains background tools.`
      : `Clause ${c.number} addresses IP ownership but does not cleanly separate Background IP from Deliverables.`;
  return {
    category: "IP Risk",
    clause: `Clause ${c.number}. ${c.heading}`,
    severity,
    explanation,
    impact:
      severity === "high"
        ? "Client may not be able to use, modify, or migrate deliverables independently of the Provider."
        : "Boundary between embedded Background IP and Deliverables may create disputes.",
    recommendation: retainsAll
      ? `Rewrite clause ${c.number} so deliverables assign to Client, with a perpetual royalty-free license-back for any embedded Background IP.`
      : `In clause ${c.number}, expressly enumerate Background IP and grant Client a perpetual, irrevocable, royalty-free license to any embedded components.`,
    excerpt: snippet(body, /work\s+product|ownership|license/i),
    source: cite(c, /work\s+product|ownership|license/i),
    evidence,
  };
};

const buildCompliance: Builder = (clauses) => {
  const c = findClause(clauses, [/data\s+protection|complian|gdpr|hipaa|ccpa|soc\s?2|iso\s?27001|security/]);
  if (!c) return null;
  const body = c.body;
  const frameworks = ["GDPR", "CCPA", "HIPAA", "SOC 2", "ISO 27001"].filter((f) =>
    new RegExp(f.replace(/\s/g, "\\s?"), "i").test(body),
  );
  const soft = /commercially\s+reasonable\s+efforts/i.test(body);
  const evidence: string[] = [];
  if (frameworks.length) evidence.push(`References: ${frameworks.join(", ")}`);
  if (soft) evidence.push('Uses soft "commercially reasonable efforts" standard');
  const high = soft && frameworks.length === 0;
  const mid = soft || frameworks.length <= 1;
  const severity = sev(high, mid);
  return {
    category: "Compliance Risk",
    clause: `Clause ${c.number}. ${c.heading}`,
    severity,
    explanation: frameworks.length
      ? `Clause ${c.number} references ${frameworks.join(", ")}${soft ? " under a soft compliance standard" : " as binding commitments"}.`
      : `Clause ${c.number} addresses compliance with only a "commercially reasonable efforts" standard and no named frameworks.`,
    impact:
      severity === "high"
        ? "Limited regulatory commitment — Client may bear the residual compliance risk."
        : "Compliance obligations exist but may lack enforcement teeth (audits, breach notification timelines).",
    recommendation: `Strengthen clause ${c.number}: require named certifications (SOC 2 Type II, ISO 27001), annual audit rights, and breach notification within 24 hours of discovery.`,
    excerpt: snippet(body, /gdpr|hipaa|ccpa|soc|compl/i),
    source: cite(c, /gdpr|hipaa|ccpa|soc|compl/i),
    evidence,
  };
};

const buildIndemnity: Builder = (clauses) => {
  const c = findClause(clauses, [/indemnif/]);
  if (!c) return null;
  const body = c.body;
  const oneWayClient =
    /client\s+shall\s+indemnify/i.test(body) && !/service\s+provider\s+shall\s+indemnify/i.test(body);
  const oneWaySP =
    /service\s+provider\s+shall\s+indemnify/i.test(body) &&
    !/client\s+shall\s+indemnify/i.test(body);
  const evidence: string[] = [];
  if (oneWayClient) evidence.push("One-way indemnity running FROM Client");
  if (oneWaySP) evidence.push("One-way indemnity running FROM Service Provider");
  if (!oneWayClient && !oneWaySP) evidence.push("Mutual indemnity language");
  const severity: Severity = oneWayClient ? "high" : oneWaySP ? "low" : "medium";
  return {
    category: "Indemnity Risk",
    clause: `Clause ${c.number}. ${c.heading}`,
    severity,
    explanation: oneWayClient
      ? `Clause ${c.number} requires only the Client to indemnify; Service Provider carries no reciprocal obligation.`
      : oneWaySP
        ? `Clause ${c.number} places indemnity obligations on the Service Provider, covering IP, negligence and misconduct.`
        : `Clause ${c.number} sets mutual indemnity covering third-party claims.`,
    impact:
      severity === "high"
        ? "Client bears unlimited downside for Provider-caused third-party claims."
        : severity === "low"
          ? "Allocation favors the Client."
          : "Balanced allocation, but scope of covered claims should be verified.",
    recommendation:
      severity === "high"
        ? `Make indemnity mutual in clause ${c.number}: Provider indemnifies Client for IP infringement, gross negligence, and willful misconduct.`
        : `Confirm scope in clause ${c.number} covers IP infringement, data breach, and bodily injury.`,
    excerpt: snippet(body, /indemnif/i),
    source: cite(c, /indemnif/i),
    evidence,
  };
};

const buildAssignment: Builder = (clauses) => {
  const c = findClause(clauses, [/assign/]);
  if (!c) return null;
  const body = c.body;
  const spFree = /service\s+provider\s+may\s+assign[^.]*sole\s+discretion/i.test(body);
  const clientRestricted = /client\s+may\s+not\s+assign/i.test(body);
  const evidence: string[] = [];
  if (spFree) evidence.push("Service Provider may assign at sole discretion");
  if (clientRestricted) evidence.push("Client requires prior written consent to assign");
  const high = spFree && clientRestricted;
  const severity: Severity = high ? "high" : "low";
  return {
    category: "Assignment Risk",
    clause: `Clause ${c.number}. ${c.heading}`,
    severity,
    explanation: high
      ? `Clause ${c.number} is asymmetric — Service Provider can freely assign while Client cannot.`
      : `Clause ${c.number} sets symmetrical assignment restrictions tied to consent or M&A events.`,
    impact: high
      ? "Client could be forced to perform with a successor Provider it did not vet."
      : "Standard market position.",
    recommendation: high
      ? `In clause ${c.number}, make assignment mutual and add a Client termination right on any Provider change-of-control.`
      : `Confirm change-of-control treatment in clause ${c.number}.`,
    excerpt: snippet(body, /assign/i),
    source: cite(c, /assign/i),
    evidence,
  };
};

const buildGoverningLaw: Builder = (clauses) => {
  const c = findClause(clauses, [/governing\s+law|dispute\s+resolution|jurisdiction|arbitration/]);
  if (!c) return null;
  const body = c.body;
  const stateMatch = body.match(/laws?\s+of\s+(?:the\s+State\s+of\s+)?([A-Z][A-Za-z ]+?)(?=[\s,.])/);
  const exclusive = /exclusively\s+in[^.]+courts/i.test(body);
  const arbitration = /arbitration/i.test(body);
  const evidence: string[] = [];
  if (stateMatch) evidence.push(`Governing law: ${stateMatch[1].trim()}`);
  if (exclusive) evidence.push("Exclusive forum specified");
  if (arbitration) evidence.push("Binding arbitration required");
  const severity: Severity = exclusive && !arbitration ? "medium" : "low";
  return {
    category: "Jurisdiction Risk",
    clause: `Clause ${c.number}. ${c.heading}`,
    severity,
    explanation: `Clause ${c.number} fixes the governing law${stateMatch ? ` to ${stateMatch[1].trim()}` : ""}${arbitration ? " and routes disputes to binding arbitration" : exclusive ? " and binds parties to an exclusive court venue" : ""}.`,
    impact:
      severity === "medium"
        ? "Travel and counsel costs in the chosen forum may be disproportionate for one party."
        : "Forum selection is standard.",
    recommendation: arbitration
      ? `In clause ${c.number}, confirm seat, arbitrator count, and emergency-injunction carve-out.`
      : `In clause ${c.number}, consider a neutral forum or fee-shifting on forum non conveniens motions.`,
    excerpt: snippet(body, /governing|law|arbitration|court/i),
    source: cite(c, /governing|law|arbitration|court/i),
    evidence,
  };
};

const BUILDERS: Builder[] = [
  buildPayment,
  buildLiability,
  buildTermination,
  buildConfidentiality,
  buildIP,
  buildCompliance,
  buildIndemnity,
  buildAssignment,
  buildGoverningLaw,
];

/* ---------------- Main analyzer ---------------- */

export function analyzeContract(text: string): ContractAnalysis {
  const T = text.replace(/\u00a0/g, " ");
  const clauses = parseClauses(T);
  const type = detectType(T, clauses);
  const parties = detectParties(T);
  const dates = T.match(DATE_RE) || [];
  const amounts = Array.from(new Set(T.match(MONEY_RE) || [])).slice(0, 6);
  const effectiveDate = dates[0] || "Not specified";
  const expirationDate = dates[1] || dates[dates.length - 1] || "Not specified";

  const payClause = findClause(clauses, [/payment|invoice|fees/]);
  const paymentTerms = payClause
    ? (payClause.body.match(/Net\s?\d+|within\s+\d+\s+days\s+of\s+invoice/i)?.[0] ?? "Per clause " + payClause.number)
    : "Not specified";

  const termClause = findClause(clauses, [/terminat|term/]);
  const noticeMatch = termClause?.body.match(/(\d+)\s*(?:\(\d+\))?\s*days?\s*(?:prior\s+)?(?:written\s+)?notice/i);
  const noticePeriod = noticeMatch ? `${noticeMatch[1]} days written notice` : "Not specified";
  const terminationConditions = noticePeriod;

  const govClause = findClause(clauses, [/governing\s+law|jurisdiction/]);
  const govMatch = govClause?.body.match(/laws?\s+of\s+(?:the\s+State\s+of\s+)?[A-Z][A-Za-z ]+/);
  const governingLaw = govMatch?.[0] ?? "Not specified";

  const confClause = findClause(clauses, [/confidential/]);
  const confidentiality = confClause
    ? `Per clause ${confClause.number}: ${snippet(confClause.body, /confidential|survive|years?/i, 140)}`
    : "No explicit confidentiality terms";

  const keyObligations: string[] = [];
  for (const c of clauses) {
    const h = c.heading.toLowerCase();
    if (/services/.test(h)) keyObligations.push(`Clause ${c.number}: Deliver services per ${c.heading.toLowerCase()}`);
    else if (/fees|payment/.test(h)) keyObligations.push(`Clause ${c.number}: Timely payment of fees and invoices`);
    else if (/confidential/.test(h)) keyObligations.push(`Clause ${c.number}: Protect Confidential Information`);
    else if (/indemnif/.test(h)) keyObligations.push(`Clause ${c.number}: Indemnify against third-party claims`);
    else if (/data|complian|security/.test(h)) keyObligations.push(`Clause ${c.number}: Maintain regulatory compliance`);
  }
  if (keyObligations.length === 0) keyObligations.push("General performance per contract terms");

  const risks: RiskItem[] = [];
  for (const b of BUILDERS) {
    const r = b(clauses, T);
    if (r) risks.push(r);
  }

  const highCount = risks.filter((r) => r.severity === "high").length;
  const mediumCount = risks.filter((r) => r.severity === "medium").length;
  const lowCount = risks.filter((r) => r.severity === "low").length;

  const riskScore = Math.min(
    100,
    Math.round(highCount * 22 + mediumCount * 11 + lowCount * 4 + 8),
  );
  const complianceScore = Math.max(
    20,
    Math.min(100, 100 - Math.round(riskScore * 0.55)),
  );

  const decision: ContractAnalysis["decision"] =
    riskScore >= 65 ? "High Risk" : riskScore >= 35 ? "Approved With Revisions" : "Approved";

  const totalClauses = clauses.length || Math.max(8, Math.round(T.length / 700));

  const categoryCounts: Record<string, number> = {
    Payment: (T.match(/payment|invoice|fee/gi) || []).length,
    Liability: (T.match(/liability|damages|indemnif/gi) || []).length,
    Termination: (T.match(/terminat|expir/gi) || []).length,
    Confidentiality: (T.match(/confidential|non[- ]disclosure/gi) || []).length,
    IP: (T.match(/intellectual\s+property|copyright|trademark|patent/gi) || []).length,
    Compliance: (T.match(/gdpr|hipaa|ccpa|soc\s?2|regulat|complian/gi) || []).length,
  };

  const summary =
    `${type} between ${parties.join(" and ") || "the parties"}, effective ${effectiveDate}. ` +
    `Parsed ${totalClauses} numbered clauses and generated ${risks.length} grounded findings ` +
    `(${highCount} high, ${mediumCount} medium, ${lowCount} low). ` +
    `Overall risk ${riskScore}/100, compliance ${complianceScore}/100. Recommended decision: ${decision}.`;

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
    noticePeriod,
    amounts,
    totalClauses,
    clauses,
    clauseCategories: Array.from(new Set(clauses.map((c) => c.category))) as ClauseCategory[],
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

/* ---------------- Retrieval-style Q&A ---------------- */

const STOPWORDS = new Set([
  "the","a","an","is","are","was","were","of","in","on","for","to","and","or","with","what","which","who","whom","whose","this","that","these","those","my","our","your","their","its","it","be","do","does","did","have","has","had","can","could","should","would","will","may","might","about","contract","clause","agreement","please","tell","me",
]);

function scoreClause(c: ParsedClause, tokens: string[]): number {
  const hay = (c.heading + " " + c.body).toLowerCase();
  let s = 0;
  for (const t of tokens) {
    if (!t) continue;
    const matches = hay.match(new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g"));
    if (matches) s += matches.length * (t.length > 5 ? 2 : 1);
    if (c.heading.toLowerCase().includes(t)) s += 3;
  }
  return s;
}

const SYNONYMS: Record<string, string[]> = {
  pay: ["payment", "invoice", "fees", "net"],
  cost: ["payment", "fees", "price"],
  price: ["fees", "amount"],
  fees: ["payment", "invoice"],
  exit: ["terminat", "renew"],
  cancel: ["terminat"],
  leave: ["terminat"],
  ip: ["intellectual", "property", "work", "ownership"],
  owner: ["ownership", "intellectual"],
  nda: ["confidential"],
  secret: ["confidential"],
  privacy: ["data", "protection", "gdpr"],
  law: ["governing", "jurisdiction"],
  court: ["governing", "jurisdiction", "arbitration"],
  risk: ["risk"],
  party: ["parties", "between"],
};

export function answerQuestion(
  q: string,
  text: string,
  a: ContractAnalysis,
): { answer: string; citation: string; source?: SourceCitation } {
  const Q = q.trim();
  if (!Q) return { answer: "Ask any question about this contract.", citation: "" };

  // Quick path: summary / parties / risk meta
  const QL = Q.toLowerCase();
  if (/^(summari[sz]e|overview|tl;?dr)/i.test(QL) || /summary/i.test(QL)) {
    return { answer: a.summary, citation: `Document type detected: ${a.type}. ${a.totalClauses} clauses parsed.` };
  }
  if (/(who|parties).*(part|sign|between)/i.test(QL) || /\bparties\b/i.test(QL)) {
    return {
      answer: `Parties to the agreement: ${a.parties.join(", ")}. Effective ${a.effectiveDate}.`,
      citation: "Detected from the agreement's preamble.",
    };
  }
  if (/(overall|total)?\s*risk\s+(score|level|profile)/i.test(QL)) {
    const top = a.risks.filter((r) => r.severity === "high").map((r) => r.category).join(", ") || "no high-severity items";
    return {
      answer: `Overall risk score ${a.riskScore}/100 across ${a.risks.length} categories (${a.highCount} high / ${a.mediumCount} medium / ${a.lowCount} low). High-severity categories: ${top}.`,
      citation: a.risks
        .filter((r) => r.severity === "high")
        .map((r) => `${r.source.heading} (clause ${r.source.clauseNumber}): ${r.explanation}`)
        .join(" | ") || a.risks[0]?.source.heading || "",
    };
  }

  // Retrieval over actual clauses
  const rawTokens = QL.split(/\W+/).filter((w) => w && !STOPWORDS.has(w));
  const tokens = [...rawTokens];
  for (const t of rawTokens) if (SYNONYMS[t]) tokens.push(...SYNONYMS[t]);

  const ranked = a.clauses
    .map((c) => ({ c, s: scoreClause(c, tokens) }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s);

  if (ranked.length === 0) {
    return {
      answer:
        "I couldn't find a clause in this contract that addresses that. Try asking about payment terms, termination, IP ownership, confidentiality, indemnity, governing law, or compliance.",
      citation: "",
    };
  }

  const top = ranked[0].c;
  // Pick the best sentence in the clause
  const sentences = top.body.split(/(?<=[.?!])\s+/);
  const best =
    sentences
      .map((s) => ({ s, score: scoreClause({ number: "", heading: "", body: s, category: "General" }, tokens) }))
      .sort((x, y) => y.score - x.score)[0]?.s ?? top.body.slice(0, 240);

  // If a risk references this exact clause, surface its recommendation too
  const relatedRisk = a.risks.find((r) => r.source.clauseNumber === top.number);
  const tail = relatedRisk ? ` This clause is flagged as ${relatedRisk.severity.toUpperCase()} ${relatedRisk.category.toLowerCase()} — recommendation: ${relatedRisk.recommendation}` : "";

  return {
    answer: `Per clause ${top.number} (${top.heading}): ${best.trim()}${tail}`,
    citation: snippet(top.body, undefined, 260),
    source: { clauseNumber: top.number, heading: top.heading, excerpt: snippet(top.body, undefined, 260) },
  };
}
