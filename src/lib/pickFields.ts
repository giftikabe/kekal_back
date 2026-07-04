/**
 * Whitelists incoming request bodies to a known set of fields before they
 * ever reach an `insert`/`update` call.
 *
 * Why this exists: several routes used to do `{ id: crypto.randomUUID(), ...body }`
 * or `db.update(table).set(body)` with the raw parsed JSON body. That is a
 * mass-assignment vulnerability — a caller could pass `{ "id": "...", "passwordHash": "..." }`
 * (or override any other column) and have it written straight to the database.
 * Every admin write route now filters through this first.
 */
export function pickFields<T extends Record<string, any> = Record<string, any>>(
  body: unknown,
  fields: readonly string[],
): Partial<T> {
  const result: Partial<T> = {};
  if (body && typeof body === "object") {
    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        (result as any)[field] = (body as any)[field as string];
      }
    }
  }
  return result;
}
