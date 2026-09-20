/** Generate a short, sortable unique id. */
export function uid(prefix = ''): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${time}${rand}`;
}
