export interface PixelMeta {
  owner?: string;
  message?: string;
  url?: string;
}

export interface PixelData {
  id: number;
  color: string;
  /** Raw DB link field — may be a legacy URL or JSON meta blob */
  link: string;
  status?: 'free' | 'reserved' | 'sold';
  owner?: string;
  message?: string;
  claimedAt?: string;
}

export interface Order {
  id: string;
  reference: string;
  pixel_ids: number[];
  amount_usd: number;
  status: 'pending' | 'paid' | 'expired';
  color: string | null;
  link: string | null;
  individual_data?: Array<{
    id: number;
    color: string;
    link?: string;
    owner?: string;
    message?: string;
  }>;
  payment_proof_url?: string;
  expires_at: string;
  created_at: string;
}

/** Encode owner + optional message (+ optional URL) into the pixels.link column */
export function encodePixelMeta(meta: PixelMeta): string {
  return JSON.stringify({
    owner: meta.owner || '',
    message: meta.message || '',
    url: meta.url || '',
  });
}

/** Parse pixels.link — supports legacy plain URLs and new JSON meta */
export function parsePixelMeta(link: string | null | undefined): PixelMeta {
  if (!link) return {};
  const trimmed = link.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        owner: typeof parsed.owner === 'string' ? parsed.owner : undefined,
        message: typeof parsed.message === 'string' ? parsed.message : undefined,
        url: typeof parsed.url === 'string' ? parsed.url : undefined,
      };
    } catch {
      return { url: link };
    }
  }
  return { url: link };
}

export function enrichPixel(row: {
  pixel_id?: number;
  id?: number;
  color?: string | null;
  link?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
}): PixelData {
  const meta = parsePixelMeta(row.link);
  return {
    id: row.pixel_id ?? row.id ?? 0,
    color: row.color || '#666666',
    link: row.link || '',
    status: (row.status as PixelData['status']) || 'free',
    owner: meta.owner,
    message: meta.message,
    claimedAt: row.updated_at || row.created_at,
  };
}
