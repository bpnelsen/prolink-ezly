// apps/web/src/lib/contracts/stipulated-sum/renderer.tsx
//
// React-PDF renderer for the Prolink stipulated-sum agreement.
// Install: pnpm add @react-pdf/renderer
//
// Usage:
//   import { renderStipulatedSumPdf } from "@/lib/contracts/stipulated-sum/renderer";
//   const pdfBuffer = await renderStipulatedSumPdf(vars, { paymentSchedule });

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  renderToBuffer,
  Font,
} from "@react-pdf/renderer";
import {
  SECTIONS,
  applySubstitutions,
  buildSubstitutions,
  DISCLAIMER,
  StipulatedSumVars,
  StipulatedSumVarsSchema,
} from "./template";

// Optional: register a serif font for legal-doc feel.
// Font.register({ family: "Source Serif Pro", src: "/fonts/SourceSerif4-Regular.ttf" });

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 72,
    paddingHorizontal: 64,
    fontSize: 11,
    lineHeight: 1.4,
    fontFamily: "Helvetica",
    color: "#111",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  logo: { height: 32, objectFit: "contain" },
  headerMeta: { fontSize: 9, color: "#666", textAlign: "right" },

  title: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  preamble: { marginBottom: 16, textAlign: "justify" },

  articleHeading: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 14,
    marginBottom: 6,
  },
  articleBody: { textAlign: "justify", marginBottom: 4 },

  paymentScheduleTable: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  paymentRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    padding: 6,
  },
  paymentRowHeader: {
    flexDirection: "row",
    backgroundColor: "#f4f4f4",
    padding: 6,
    fontWeight: "bold",
  },
  paymentCellLabel: { flex: 2 },
  paymentCellTrigger: { flex: 3 },
  paymentCellAmount: { flex: 1, textAlign: "right" },

  disclaimer: {
    marginTop: 28,
    padding: 12,
    backgroundColor: "#fff7e6",
    borderWidth: 1,
    borderColor: "#f0c674",
    fontSize: 9,
    color: "#5b4500",
  },
  disclaimerTitle: { fontWeight: "bold", marginBottom: 4 },

  pageNumber: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 9,
    color: "#888",
  },
});

function formatCurrencyForTable(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

interface ContractPdfProps {
  vars: StipulatedSumVars;
}

export const StipulatedSumPdf: React.FC<ContractPdfProps> = ({ vars }) => {
  const subs = buildSubstitutions(vars);

  return (
    <Document
      title={`${vars.projectName} — Agreement`}
      author={vars.contractorName}
      subject="Stipulated-Sum Construction Agreement"
    >
      <Page size="LETTER" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.header} fixed>
          {vars.contractorLogoUrl ? (
            <Image src={vars.contractorLogoUrl} style={styles.logo} />
          ) : (
            <Text style={{ fontSize: 11, fontWeight: "bold" }}>
              {vars.contractorName}
            </Text>
          )}
          <View>
            <Text style={styles.headerMeta}>{vars.projectName}</Text>
            <Text style={styles.headerMeta}>Agreement — {subs.agreementDate}</Text>
          </View>
        </View>

        {/* Body sections */}
        {SECTIONS.map((section) => {
          const body = applySubstitutions(section.body, subs);
          return (
            <View key={section.id} wrap={false}>
              {section.heading && (
                <Text style={styles.articleHeading}>{section.heading}</Text>
              )}
              <Text style={section.id === "title" ? styles.title : styles.articleBody}>
                {body}
              </Text>
            </View>
          );
        })}

        {/* Exhibit A — Scope of Work */}
        <View break>
          <Text style={styles.articleHeading}>Exhibit A — Scope of Work</Text>
          <Text style={styles.articleBody}>{vars.projectDescription}</Text>
        </View>

        {/* Exhibit B — Payment Schedule */}
        {vars.paymentSchedule.length > 0 && (
          <View>
            <Text style={styles.articleHeading}>Exhibit B — Payment Schedule</Text>
            <View style={styles.paymentScheduleTable}>
              <View style={styles.paymentRowHeader}>
                <Text style={styles.paymentCellLabel}>Milestone</Text>
                <Text style={styles.paymentCellTrigger}>Trigger</Text>
                <Text style={styles.paymentCellAmount}>Amount</Text>
              </View>
              {vars.paymentSchedule.map((ms, i) => (
                <View key={i} style={styles.paymentRow}>
                  <Text style={styles.paymentCellLabel}>{ms.label}</Text>
                  <Text style={styles.paymentCellTrigger}>
                    {ms.triggerDescription}
                  </Text>
                  <Text style={styles.paymentCellAmount}>
                    {formatCurrencyForTable(ms.amountCents)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Disclaimer — required */}
        <View style={styles.disclaimer} wrap={false}>
          <Text style={styles.disclaimerTitle}>IMPORTANT — NOT LEGAL ADVICE</Text>
          <Text>{DISCLAIMER.split("\n").slice(2).join(" ").trim()}</Text>
        </View>

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
};

/**
 * Render the contract to a PDF buffer.
 * Validates vars first; throws ZodError if invalid.
 */
export async function renderStipulatedSumPdf(
  rawVars: unknown
): Promise<Buffer> {
  const vars = StipulatedSumVarsSchema.parse(rawVars);
  return renderToBuffer(<StipulatedSumPdf vars={vars} />);
}
