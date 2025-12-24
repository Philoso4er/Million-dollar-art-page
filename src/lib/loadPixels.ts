import { supabase } from './supabase';
import { PixelData } from '../types';

export type PixelRow = {
  pixel_id: number;
  color: string | null;
  link: string | null;
  status: 'free' | 'reserved' | 'sold';
};

export async function loadPixels(): Promise<Map<number, PixelData & { status: string }>> {
  const { data, error } = await supabase
    .from('pixels')
    .select('pixel_id, color, link, status');

  if (error) {
    console.error('Failed to load pixels:', error);
    return new Map();
  }

  const map = new Map<number, PixelData & { status: string }>();

  for (const row of data as PixelRow[]) {
    if (row.status === 'sold' || row.status === 'reserved') {
      map.set(row.pixel_id, {
        id: row.pixel_id,
        color: row.color ?? '#666666',
        link: row.link ?? '',
        status: row.status
      });
    }
  }

  return map;
}
