// The product name lives here and nowhere else (SPEC §15.7 #20). Rendered
// by <Wordmark> (components/rts/core.tsx); imported directly only where the
// brand appears as plain text: metadata, footers, the PDF stamp line.
export const BRAND_NAME = "Road to Success";
export const BRAND_MONOGRAM = "RTS";

// Formal name order (SPEC §15.7 #21): surname first. Conversational labels
// ("Note from Dimitra", "Send to Dimitra") keep the first name and do NOT
// use this constant.
export const TUTOR_NAME = "Anglou Dimitra";
export const BRAND_BYLINE = `by ${TUTOR_NAME}`;

/** The footer line: "Road to Success · IB {subject} with Anglou Dimitra". */
export function brandFooterLine(subject = "Chemistry"): string {
  return `${BRAND_NAME} · IB ${subject} with ${TUTOR_NAME}`;
}
