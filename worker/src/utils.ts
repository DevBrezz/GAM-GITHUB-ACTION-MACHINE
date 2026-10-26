export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })
}

export function error(message: string, status = 400, code?: string, details?: unknown): Response {
  return json({ error: message, code, details }, status)
}

export function corsHeaders(origin: string | null, allowed: string[]): HeadersInit {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
    'Access-Control-Max-Age': '86400',
  }
  if (origin && (allowed.includes('*') || allowed.includes(origin))) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Vary'] = 'Origin'
  } else if (allowed.includes('*')) {
    headers['Access-Control-Allow-Origin'] = '*'
  }
  return headers
}

export function generateBuildId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function isValidBuildId(id: string): boolean {
  return /^[a-f0-9]{32}$/.test(id)
}

/** Basic ZIP local-file header check + path traversal rejection for common patterns */
export async function validateZipBasic(buf: ArrayBuffer, maxBytes: number): Promise<{ ok: boolean; reason?: string }> {
  if (buf.byteLength === 0) return { ok: false, reason: 'Empty file' }
  if (buf.byteLength > maxBytes) return { ok: false, reason: 'File too large' }
  const u8 = new Uint8Array(buf)
  // ZIP magic: PK\x03\x04 or empty archive PK\x05\x06
  if (!(u8[0] === 0x50 && u8[1] === 0x4b && (u8[2] === 0x03 || u8[2] === 0x05 || u8[2] === 0x07))) {
    return { ok: false, reason: 'Not a valid ZIP (bad magic)' }
  }
  // Crude path-traversal scan on central directory strings is expensive; reject obvious patterns in first 64KB
  const sample = new TextDecoder('latin1').decode(u8.slice(0, Math.min(u8.length, 65536)))
  if (sample.includes('../') || sample.includes('..\\') || /[\\/]\.\.[\\/]/.test(sample)) {
    return { ok: false, reason: 'ZIP appears to contain path traversal sequences' }
  }
  return { ok: true }
}

export function parseMeta(raw: string | null): {
  fileName?: string
  fileSize?: number
  profile?: string
  customCommand?: string
  timeoutMinutes?: number
} {
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}
