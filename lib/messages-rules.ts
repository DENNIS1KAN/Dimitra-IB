// Message body rule (SPEC §15.4): trimmed, non-empty, at most 4000
// characters. Pure so both the student composer and the tutor reply share
// it and it is trivially unit-tested; the server is the only enforcer.

export const MAX_MESSAGE_LENGTH = 4000;

export type BodyCheck = { ok: true; body: string } | { ok: false; reason: "empty" | "too-long" };

export function validateMessageBody(raw: unknown): BodyCheck {
  if (typeof raw !== "string") return { ok: false, reason: "empty" };
  const body = raw.trim();
  if (!body) return { ok: false, reason: "empty" };
  if (body.length > MAX_MESSAGE_LENGTH) return { ok: false, reason: "too-long" };
  return { ok: true, body };
}
