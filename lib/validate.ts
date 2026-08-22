// Route params and form ids feed uuid-typed columns; Postgres raises 22P02
// ("invalid input syntax for type uuid") on anything else, which surfaces as
// a 500 instead of the intended 404. Cheap shape check, applied at the door.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: string): boolean => UUID_RE.test(value);
