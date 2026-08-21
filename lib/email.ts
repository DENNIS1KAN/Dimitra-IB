import "server-only";

// Prod delivery via Resend (SPEC §9). Only ever imported when RESEND_API_KEY
// is set; dev mode prints links to the console instead (see lib/auth.ts).
export async function sendMagicLinkEmail(email: string, link: string) {
  const from = process.env.EMAIL_FROM ?? "Lumen <no-reply@localhost>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Your Lumen sign-in link",
      text: `Sign in to Lumen:\n\n${link}\n\nThis link works once and expires in 30 minutes.`,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend failed: ${res.status} ${await res.text()}`);
  }
}
