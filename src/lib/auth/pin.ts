// PIN hashing — must match the seed formula: sha256(salt + pin), hex-encoded.
export async function hashPin(salt: string, pin: string): Promise<string> {
  const data = new TextEncoder().encode(salt + pin)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}
