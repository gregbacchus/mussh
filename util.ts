export function asArray<T>(input?: T | T[] | null): T[] {
  if (Array.isArray(input)) return input;
  return input !== undefined && input != null
    ? [input]
    : [];
}
