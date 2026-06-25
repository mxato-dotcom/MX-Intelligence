export async function computeContentHash(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value)
  const buffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function computeArticleHash(url: string, title: string): Promise<string> {
  return computeContentHash(`${url.trim().toLowerCase()}::${title.trim().toLowerCase()}`)
}
