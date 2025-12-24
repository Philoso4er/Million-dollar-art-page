export interface PixelData {
  id: number;
  color: string;
  link: string;
  status?: 'free' | 'reserved' | 'sold';
}
