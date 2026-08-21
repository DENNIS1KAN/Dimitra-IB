/** Postgres unique-violation check that sees through Drizzle's error wrapper. */
export function isUniqueViolation(err: unknown): boolean {
  const code =
    (err as { code?: string })?.code ??
    ((err as { cause?: { code?: string } })?.cause?.code ?? null);
  return code === "23505";
}
