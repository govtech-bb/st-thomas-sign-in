// Crockford-style alphabet: no 0/O/1/I/L confusables.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateToken(length = 4): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function isPlausibleToken(value: string): boolean {
  return /^[A-Z2-9]{3,8}$/.test(value);
}
