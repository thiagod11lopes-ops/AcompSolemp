export function slugLogin(text: string): string {
  const slug = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 40)

  return slug || `user.${Date.now()}`
}

export function ensureUniqueLogin(
  base: string,
  existing: Set<string>,
): string {
  let login = base
  let counter = 1
  while (existing.has(login)) {
    login = `${base}.${counter}`
    counter += 1
  }
  return login
}
