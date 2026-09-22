/** SHA-256 en hex, vía Web Crypto — disponible tanto en el hilo principal como en el worker. */
export async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  // Normaliza a un Uint8Array respaldado por un ArrayBuffer real (nunca SharedArrayBuffer),
  // que es lo único que crypto.subtle.digest acepta bajo los tipos genéricos de TS 5.7+.
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(data))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
