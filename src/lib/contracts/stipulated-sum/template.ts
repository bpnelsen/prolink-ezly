// apps/web/src/lib/contracts/stipulated-sum/template.ts
//
// Prolink Stipulated-Sum Agreement template.
//
// IMPORTANT IP NOTE:
// The AIA A101™ Standard Form of Agreement is copyrighted by the American
// Institute of Architects. We do NOT reproduce AIA text here. This template
// is an original Prolink-authored stipulated-sum agreement that follows the
// industry-standard structure (which is not itself copyrightable) but uses
// original provisions. If a user explicitly needs the official AIA A101,
// they must license it directly from AIA (acdcustomercare@aia.org / ACD5).
// Surface this in the UI as a "Use official AIA A101 instead" option that
// links out to AIA's licensing portal.

import { z } from "zod";

// ---------------------------------------------------------------------------
// Variable schema — these are the fields that get substituted into the doc.
// Validate user input with this before rendering.
// ---------------------------------------------------------------------------

export const StipulatedSumVarsSchema = z.object({
  // Parties
  ownerName: z.string().min(1, "Owner name is required"),
  ownerAddress: z.string().min(1, "Owner address is required"),
  ownerEmail: z.string().email().optional(),
  ownerPhone: z.string().optional(),

  contractorName: z.string().min(1, "Contractor name is required"),
  contractorAddress: z.string().min(1, "Contractor address is required"),
  contractorLicenseNumber: z.string().optional(),
  contractorEmail: z.string().email().optional(),
  contractorPhone: z.string().optional(),

  // Project
  projectName: z.string().min(1, "Project name is required"),
  projectAddress: z.string().min(1, "Project address is required"),
  projectDescription: z.string().min(1, "Scope of work description is required"),

  // Dates
  agreementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date format YYYY-MM-DD"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  substantialCompletionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  // Money
  contractSumCents: z.number().int().positive(),
  depositCents: z.number().int().nonnegative().default(0),
  retainagePercent: z.number().min(0).max(20).default(10),

  // Payment schedule — array of milestone-based or monthly progress payments
  paymentSchedule: z.array(
    z.object({
      label: z.string(),
      amountCents: z.number().int().positive(),
      triggerDescription: z.string(), // e.g. "Upon completion of framing"
    })
  ).default([]),

  // Optional clauses
  liquidatedDamagesPerDayCents: z.number().int().nonnegative().optional(),
  governingStateUS: z.string().length(2).default("UT"), // ISO state code
  changeOrderProcedure: z.enum(["written_only", "written_or_email"]).default("written_only"),

  // Branding
  contractorLogoUrl: z.string().url().optional(),
});

export type StipulatedSumVars = z.infer<typeof StipulatedSumVarsSchema>;

// ---------------------------------------------------------------------------
// Document section text — original Prolink wording.
// Variables in {{double_braces}} are substituted at render time.
// ---------------------------------------------------------------------------

export const SECTIONS = [
  {
    id: "title",
    heading: null,
    body: `STIPULATED-SUM AGREEMENT BETWEEN OWNER AND CONTRACTOR

This Agreement is made as of {{agreementDate}} between {{ownerName}} (the "Owner") and {{contractorName}} (the "Contractor") for the Project described below.`,
  },
  {
    id: "parties",
    heading: "Article 1 — The Parties",
    body: `1.1  Owner: {{ownerName}}, located at {{ownerAddress}}.
1.2  Contractor: {{contractorName}}, located at {{contractorAddress}}{{contractorLicenseClause}}.`,
  },
  {
    id: "project",
    heading: "Article 2 — The Project and Scope of Work",
    body: `2.1  The Project is identified as "{{projectName}}", located at {{projectAddress}}.
2.2  The Contractor shall perform the work described in the Scope of Work attached as Exhibit A, and shall furnish all labor, materials, equipment, supervision, and other services necessary to complete the Work in accordance with this Agreement.
2.3  Scope of Work summary: {{projectDescription}}`,
  },
  {
    id: "time",
    heading: "Article 3 — Time of Commencement and Completion",
    body: `3.1  The Contractor shall commence the Work on or before {{startDate}}.
3.2  The Contractor shall achieve Substantial Completion of the Work on or before {{substantialCompletionDate}}, subject to adjustments authorized in writing by the Owner pursuant to Article 7 (Change Orders).
3.3  Time is of the essence. Delays caused by events outside the reasonable control of the Contractor (including but not limited to weather events materially affecting outdoor work, owner-directed changes, and force majeure) shall entitle the Contractor to a reasonable extension of time upon written notice to the Owner within seven (7) days of the delay event.{{liquidatedDamagesClause}}`,
  },
  {
    id: "contract-sum",
    heading: "Article 4 — Contract Sum",
    body: `4.1  The Owner shall pay the Contractor the stipulated sum of {{contractSumFormatted}} (the "Contract Sum") for performance of the Work, subject to additions and deductions for Change Orders.
4.2  The Contract Sum is based on the Scope of Work and any specifications attached as exhibits, and is the total compensation payable to the Contractor for the Work.`,
  },
  {
    id: "deposit",
    heading: "Article 5 — Deposit",
    body: `5.1  Upon execution of this Agreement, the Owner shall pay the Contractor a deposit of {{depositFormatted}}, which shall be credited against the first progress payment owed to the Contractor.
5.2  If no deposit is required, this Article 5 is of no effect.`,
  },
  {
    id: "payments",
    heading: "Article 6 — Progress Payments and Retainage",
    body: `6.1  The Owner shall make progress payments to the Contractor on account of the Contract Sum as the Work proceeds, in accordance with the payment schedule attached as Exhibit B.
6.2  The Owner shall withhold from each progress payment a retainage equal to {{retainagePercent}}% of the payment, which retainage shall be released upon Final Completion of the Work and acceptance by the Owner.
6.3  Each application for payment shall be submitted by the Contractor to the Owner at least seven (7) days before the payment is due, accompanied by reasonable documentation of the Work completed (including photographs where appropriate).
6.4  Final payment, including release of all retainage, shall be made upon (a) Final Completion of the Work, (b) submission by the Contractor of all required lien waivers, warranties, and operating documentation, and (c) the Owner's acceptance of the completed Work.`,
  },
  {
    id: "change-orders",
    heading: "Article 7 — Change Orders",
    body: `7.1  The Owner may, without invalidating this Agreement, order changes in the Work consisting of additions, deletions, or modifications. All such changes shall be authorized by a written Change Order signed by both Owner and Contractor before the changed Work is performed{{changeOrderEmailClause}}.
7.2  Each Change Order shall state the change in the Work, any adjustment to the Contract Sum, and any adjustment to the time for completion.
7.3  No claim for an addition to the Contract Sum or extension of time shall be valid unless authorized by a Change Order in accordance with this Article 7.`,
  },
  {
    id: "warranties",
    heading: "Article 8 — Warranties",
    body: `8.1  The Contractor warrants to the Owner that the materials and equipment furnished under this Agreement will be of good quality and new unless the Agreement requires or permits otherwise, that the Work will be free from defects, and that the Work will conform to the requirements of this Agreement.
8.2  The Contractor shall promptly correct Work rejected by the Owner as failing to conform to the requirements of this Agreement, whether observed before or after Substantial Completion, and whether or not fabricated, installed, or completed, for a period of one (1) year from the date of Substantial Completion, unless a longer period is specified by applicable law or manufacturer warranty.`,
  },
  {
    id: "insurance",
    heading: "Article 9 — Insurance",
    body: `9.1  The Contractor shall maintain commercial general liability insurance with limits not less than $1,000,000 per occurrence and $2,000,000 in the aggregate, and workers' compensation insurance as required by the law of the state of {{governingStateUS}}, for the duration of the Work.
9.2  Upon request, the Contractor shall furnish the Owner with certificates of insurance evidencing the coverage required by this Article 9.`,
  },
  {
    id: "termination",
    heading: "Article 10 — Termination",
    body: `10.1  The Owner may terminate this Agreement for convenience upon seven (7) days' written notice to the Contractor, in which case the Owner shall pay the Contractor for Work properly performed through the date of termination, plus reasonable demobilization costs.
10.2  Either party may terminate this Agreement for the other party's material breach upon fourteen (14) days' written notice, if the breach has not been cured within the notice period.`,
  },
  {
    id: "disputes",
    heading: "Article 11 — Dispute Resolution",
    body: `11.1  Any dispute arising under this Agreement shall first be addressed by direct negotiation between the parties.
11.2  If the dispute is not resolved within thirty (30) days of written notice of the dispute, the parties shall attempt to resolve it through mediation administered by a mutually agreed mediator before either party initiates litigation.
11.3  This Agreement shall be governed by the laws of the state of {{governingStateUS}}.`,
  },
  {
    id: "general",
    heading: "Article 12 — General Provisions",
    body: `12.1  This Agreement, together with the exhibits attached hereto, constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements relating to the subject matter hereof.
12.2  No modification of this Agreement shall be effective unless in writing and signed by both parties.
12.3  If any provision of this Agreement is held to be unenforceable, the remaining provisions shall remain in full force and effect.`,
  },
  {
    id: "signatures",
    heading: "Article 13 — Signatures",
    body: `Executed as of the date first written above.

OWNER:
________________________________
{{ownerName}}
Date: ______________

CONTRACTOR:
________________________________
{{contractorName}}
{{contractorLicenseLine}}
Date: ______________`,
  },
] as const;

// ---------------------------------------------------------------------------
// Variable substitution
// ---------------------------------------------------------------------------

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function buildSubstitutions(vars: StipulatedSumVars): Record<string, string> {
  const subs: Record<string, string> = {
    agreementDate: formatDate(vars.agreementDate),
    startDate: formatDate(vars.startDate),
    substantialCompletionDate: formatDate(vars.substantialCompletionDate),
    ownerName: vars.ownerName,
    ownerAddress: vars.ownerAddress,
    contractorName: vars.contractorName,
    contractorAddress: vars.contractorAddress,
    projectName: vars.projectName,
    projectAddress: vars.projectAddress,
    projectDescription: vars.projectDescription,
    contractSumFormatted: formatCurrency(vars.contractSumCents),
    depositFormatted: formatCurrency(vars.depositCents),
    retainagePercent: String(vars.retainagePercent),
    governingStateUS: vars.governingStateUS,
    contractorLicenseClause: vars.contractorLicenseNumber
      ? ` (License No. ${vars.contractorLicenseNumber})`
      : "",
    contractorLicenseLine: vars.contractorLicenseNumber
      ? `License No. ${vars.contractorLicenseNumber}`
      : "",
    liquidatedDamagesClause: vars.liquidatedDamagesPerDayCents
      ? ` If the Contractor fails to achieve Substantial Completion by the date stated in §3.2, as adjusted, the Contractor shall be liable to the Owner for liquidated damages of ${formatCurrency(
          vars.liquidatedDamagesPerDayCents
        )} per calendar day of delay until Substantial Completion is achieved.`
      : "",
    changeOrderEmailClause:
      vars.changeOrderProcedure === "written_or_email"
        ? "; an exchange of emails between the parties confirming the change shall be deemed a written Change Order for purposes of this Article 7"
        : "",
  };

  return subs;
}

export function applySubstitutions(text: string, subs: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => subs[key] ?? `[MISSING: ${key}]`);
}

// ---------------------------------------------------------------------------
// Mandatory disclaimer — must appear in PDF and UI.
// ---------------------------------------------------------------------------

export const DISCLAIMER = `
IMPORTANT — NOT LEGAL ADVICE

This document is a contract template provided by Prolink for the convenience of the parties. Prolink is not a law firm and does not provide legal advice. The parties are strongly encouraged to have this document reviewed by a licensed attorney in the applicable jurisdiction before signing.

This template is an original document prepared by Prolink. It is NOT the AIA A101™ Standard Form of Agreement, which is a separate document copyrighted by the American Institute of Architects and licensed separately through AIA Contract Documents (ACD5).
`.trim();
