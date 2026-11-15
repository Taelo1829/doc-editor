let fallbackCounter = 0;

export function createId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${(fallbackCounter++).toString(36)}`;
  return `${prefix}_${random}`;
}
