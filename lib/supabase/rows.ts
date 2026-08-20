function camelKey(key: string) {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export function camelize<T>(value: unknown): T {
  if (Array.isArray(value)) return value.map((item) => camelize(item)) as T;
  if (!value || typeof value !== "object" || value instanceof Date) return value as T;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [camelKey(key), camelize(item)]),
  ) as T;
}

export function assertNoError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
