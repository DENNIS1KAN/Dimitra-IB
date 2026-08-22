import { z } from "zod";

// Route params and form ids feed uuid-typed columns; Postgres raises 22P02
// ("invalid input syntax for type uuid") on anything else, which surfaces as
// a 500 instead of the intended 404. Shape-checked at the door, so handlers
// can answer 404/400 cleanly.
const uuidSchema = z.uuid();

export const isUuid = (value: string): boolean => uuidSchema.safeParse(value).success;
