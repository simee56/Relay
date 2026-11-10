const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
    return UUID_PATTERN.test(value);
}
export function uniqueViolationConstraint(err: unknown): string | null {
    const e = err as { code?: string; constraint?: string } | null;
    return e?.code === "23505" ? (e.constraint ?? "") : null;
}