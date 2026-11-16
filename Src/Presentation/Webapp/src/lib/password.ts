export const MIN_PASSWORD_LENGTH = 12

/** Generates a random password from an unambiguous alphabet using the Web Crypto API. */
export function generatePassword(length = 16) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?'
  const values = crypto.getRandomValues(new Uint32Array(length))
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('')
}
