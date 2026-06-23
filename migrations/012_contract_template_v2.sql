-- Migration 012: Owner-Contractor template v2
-- Retires the v1 template seeded in migration 010 and inserts a v2 with:
--   * 14 articles covering the standard topical ground of a stipulated-sum
--     construction agreement, in original Prolink-authored prose (no AIA text).
--   * Owner-direct payment mechanics (no architect in the loop).
--   * A final "Acknowledgment and Limitations" article that both parties sign,
--     stating Prolink by EZLY is not a law firm and the agreement reflects
--     mutual expectations and job outline only.
-- Run in the Supabase SQL editor.

-- 1. Retire the v1 template so the lookup logic prefers v2.
UPDATE public.contract_templates
SET retired_date = CURRENT_DATE
WHERE template_type = 'owner_contractor'
  AND version = 1
  AND retired_date IS NULL;

-- 2. Insert v2.
INSERT INTO public.contract_templates (template_type, jurisdiction_state, version, effective_date, content)
SELECT 'owner_contractor', NULL, 2, CURRENT_DATE, $json$
{
  "title": "Owner-Contractor Construction Agreement",
  "intro": "This Owner-Contractor Construction Agreement (this \"Agreement\") is entered into as of {{contract.start_date|date}} between {{computed.owner_full_name}} (\"Owner\") and {{contractor.business_name}} (\"Contractor\"). The parties agree as follows.",
  "parties": {
    "owner": {
      "heading": "Owner",
      "lines": ["{{computed.owner_full_name}}", "{{client.street_address}}", "{{client.city}}, {{client.state|state_name}} {{client.zip_code}}", "{{client.phone}}", "{{client.email}}"]
    },
    "contractor": {
      "heading": "Contractor",
      "lines": ["{{contractor.business_name}}", "{{computed.contractor_address_full}}", "License: {{contractorLicense.number}}", "{{contractor.phone}}"]
    }
  },
  "project": {
    "heading": "Project",
    "lines": ["Project Address: {{computed.project_address_full}}", "Start Date: {{contract.start_date|date}}", "Substantial Completion: {{contract.substantial_completion_date|date}}"]
  },
  "articles": [
    {
      "n": 1,
      "heading": "Contract Documents and Exhibits",
      "body": "The contract between the parties consists of (a) this signed Agreement, (b) the scope of work, payment schedule, and any plans, drawings, photographs, or specifications attached as exhibits and incorporated by reference, and (c) any change orders executed under Article 7. If any portion of an exhibit conflicts with the body of this Agreement, the body of this Agreement controls."
    },
    {
      "n": 2,
      "heading": "The Work",
      "body": "The Contractor shall furnish all labor, materials, equipment, tools, and supervision necessary to perform the construction services described in the scope of work (the \"Work\"). The Contractor shall perform the Work in a good and workmanlike manner consistent with industry standards and in compliance with all applicable building codes, permits, and laws of the jurisdiction in which the Work is performed."
    },
    {
      "n": 3,
      "heading": "Commencement and Substantial Completion",
      "body": "The Contractor shall commence the Work on or about {{contract.start_date|date}} and shall achieve substantial completion on or about {{contract.substantial_completion_date|date}}, subject to delays beyond the Contractor's reasonable control, including weather, owner-directed changes, permitting or inspection delays, and material shortages. \"Substantial completion\" means the Work is sufficiently complete that the Owner may occupy and use it for its intended purpose."
    },
    {
      "n": 4,
      "heading": "Contract Sum",
      "body": "The Owner shall pay the Contractor a total contract sum of {{contract.contract_sum|currency}} (the \"Contract Sum\") for full performance of the Work, subject to additions and deductions made by change orders executed under Article 7. The Contract Sum includes all labor, materials, the Contractor's overhead and profit, and any sales or use taxes. Any allowances, unit prices, or alternate pricing items are listed in the scope of work or an attached exhibit and are subject to reconciliation by change order if actual quantities or selections differ."
    },
    {
      "n": 5,
      "heading": "Progress Payments",
      "body": "A deposit of {{contract.deposit_pct|percent}} ({{computed.deposit_amount|currency}}) of the Contract Sum is due upon execution of this Agreement. Thereafter, the Contractor may submit a written application for payment to the Owner no more frequently than once per calendar month, due on or about the {{contract.application_due_day|int}} day of the month. Each application shall reflect the percentage of completion of each item in the payment schedule. The Owner shall pay the approved amount within {{contract.payment_due_days|int}} days of receipt of the application, less a retainage of {{contract.retainage_pct|percent}} withheld from each progress payment. The Owner is not required to pay for Work that is not in substantial conformance with the scope of work, provided the Owner identifies the non-conforming items in writing within the {{contract.payment_due_days|int}}-day review period."
    },
    {
      "n": 6,
      "heading": "Final Payment",
      "body": "Final payment, including release of all retainage, is due within {{contract.payment_due_days|int}} days after each of the following has occurred: (i) the Work is fully complete, (ii) any items on a mutually agreed punch list have been addressed, and (iii) the Contractor has delivered any required final lien waivers, manufacturer warranties, and as-built documentation reasonably available. Acceptance of final payment by the Contractor constitutes a waiver of further claims arising under this Agreement except for unsettled change orders and the warranty obligations under Article 11."
    },
    {
      "n": 7,
      "heading": "Change Orders",
      "body": "Any change to the scope of work, the Contract Sum, or the substantial completion date must be documented in a written change order signed by both parties before the changed Work is performed. The Contractor is not obligated to perform changes until a signed change order is in place, except in the case of work necessary to prevent imminent damage to person or property, which the Contractor may perform and document in a change order promptly afterward."
    },
    {
      "n": 8,
      "heading": "Termination and Suspension",
      "body": "Either party may terminate this Agreement upon a material breach by the other party that is not cured within fourteen (14) days after written notice describing the breach. The Owner may also terminate this Agreement for convenience upon written notice, in which case the Contractor is entitled to payment for Work completed through the date of termination plus reasonable demobilization costs. Either party may suspend its performance if delayed for more than thirty (30) days by the other party's failure to perform, by non-payment, or by an event of force majeure."
    },
    {
      "n": 9,
      "heading": "Representatives and Notices",
      "body": "Each party shall designate a representative authorized to make binding decisions about the Work on its behalf. The Owner's representative and the Contractor's representative are the individuals identified in the party blocks above unless replaced by ten (10) days' written notice to the other party. All notices required by this Agreement shall be in writing and may be delivered by email to the addresses on file with Prolink, by hand delivery, or by certified mail to the addresses listed above."
    },
    {
      "n": 10,
      "heading": "Insurance and Bonds",
      "body": "The Contractor shall maintain commercial general liability insurance, workers' compensation insurance where required by law, and any other coverage commercially reasonable for the type and scale of the Work, in amounts customary for similar projects in the State of {{contract.governing_law_state|state_name}}. The Contractor shall furnish certificates of insurance to the Owner upon written request. The Contractor is not required to provide a performance or payment bond unless expressly required by the scope of work or an attached exhibit."
    },
    {
      "n": 11,
      "heading": "Warranty",
      "body": "The Contractor warrants that all Work shall be free from material defects in workmanship for a period of one (1) year following substantial completion. Manufacturer warranties on materials and equipment shall pass through to the Owner to the extent assignable. This warranty does not cover damage caused by misuse, normal wear and tear, neglect, alterations performed by others after substantial completion, or acts of God."
    },
    {
      "n": 12,
      "heading": "Dispute Resolution",
      "body": "If any dispute arises under this Agreement, the parties shall first attempt in good faith to resolve it through direct negotiation between their representatives. If the dispute is not resolved within thirty (30) days of written notice of the dispute, the dispute shall proceed by {{contract.dispute_method|humanize}}. The prevailing party in any binding dispute proceeding is entitled to recover reasonable attorney's fees and costs to the extent allowed by law. This Agreement is governed by the laws of the State of {{contract.governing_law_state|state_name}}, without regard to its conflict-of-laws provisions."
    },
    {
      "n": 13,
      "heading": "Miscellaneous",
      "body": "Any payment not made when due shall accrue interest at the rate of {{contract.late_interest_rate_annual|percent}} per annum, or the maximum rate permitted by law, whichever is lower. Neither party may assign this Agreement without the other party's written consent, except that the Contractor may engage licensed subcontractors and suppliers in the ordinary course. If any provision of this Agreement is held unenforceable, the remaining provisions shall remain in full effect. This Agreement may be executed in counterparts, including by electronic signature, each of which is an original. This Agreement, together with its exhibits and any executed change orders, constitutes the entire agreement between the parties and supersedes all prior discussions, proposals, and understandings on the same subject matter."
    },
    {
      "n": 14,
      "heading": "Acknowledgment and Limitations",
      "body": "The Owner and the Contractor each acknowledge and agree that this Agreement was prepared using a template made available through Prolink by EZLY, a software platform. Prolink by EZLY is not a law firm, is not engaged in the practice of law, and does not provide legal advice. Each party has had the opportunity to seek independent legal counsel before signing this Agreement. The parties intend this Agreement to memorialize their mutual expectations and the outline of the Work as understood at the time of signing, and they will rely on it for that purpose. By signing below, each party confirms that it has read and understood this Acknowledgment."
    }
  ],
  "exhibit_a": {
    "heading": "Exhibit A — Payment Schedule",
    "source": "milestones"
  },
  "signatures": [
    { "role": "owner",      "label": "Owner" },
    { "role": "contractor", "label": "Contractor" }
  ]
}
$json$::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.contract_templates
  WHERE template_type = 'owner_contractor' AND version = 2
);
