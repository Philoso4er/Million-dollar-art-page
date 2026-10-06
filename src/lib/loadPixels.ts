import { supabase } from './supabase';
import { PixelData, enrichPixel } from '../../types';

export type PixelRow = {
  pixel_id: number;
  color: string | null;
  link: string | null;
  status: 'free' | 'reserved' | 'sold';
  created_at?: string;
  updated_at?: string;
};

export async function loadPixels(): Promise<Map<number, PixelData>> {
  const { data, error } = await supabase
    .from('pixels')
    .select('pixel_id, color, link, status, created_at, updated_at');

  if (error) {
    console.error('Failed to load pixels:', error);
    return new Map();
  }

  const map = new Map<number, PixelData>();

  if (data) {
    for (const row of data as PixelRow[]) {
      if (row.status === 'sold' || row.status === 'reserved') {
        map.set(row.pixel_id, enrichPixel(row));
      }
    }
  }

  return map;
}
