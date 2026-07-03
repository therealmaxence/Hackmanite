export function serializeRow(row: any) {
  const obj: any = {};
  for (const key of Object.keys(row)) {
    const value = row[key];
    obj[key] = typeof value === 'bigint' ? Number(value) : value;
  }
  return obj;
}
