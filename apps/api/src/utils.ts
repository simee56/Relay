const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
    return UUID_PATTERN.test(value);
}
export function isUniqueViolation(err: unknown): boolean {
    return (err as { code?: string } | null)?.code === "23505";
}