export interface PixelData {
  id: number;
  color: string;
  link: string;
  status?: 'free' | 'reserved' | 'sold';
}

export interface Order {
  id: string;
  reference: string;
  pixel_ids: number[];
  amount_usd: number;
  status: 'pending' | 'paid' | 'expired';
  color: string | null;
  link: string | null;
  individual_data?: Array<{ id: number; color: string; link: string }>;
  payment_proof_url?: string;
  expires_at: string;
  created_at: string;
}
