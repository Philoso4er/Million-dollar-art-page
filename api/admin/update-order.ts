import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  const { orderId } = req.body;

  // Get order details
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (!order) return res.status(404).json({ error: 'Order not found' });

  // Mark order as paid
  await supabase
    .from('orders')
    .update({ status: 'paid' })
    .eq('id', orderId);

  // Update pixels
  const pixelUpdates = order.pixel_ids.map((pixelId: number) => {
    let pixelColor = order.color;
    let pixelLink = order.link;

    if (order.individual_data) {
      const individualPixel = order.individual_data.find((p: any) => p.id === pixelId);
      if (individualPixel) {
        pixelColor = individualPixel.color;
        pixelLink = individualPixel.link;
      }
    }

    return {
      pixel_id: pixelId,
      status: 'sold',
      color: pixelColor,
      link: pixelLink,
      order_id: orderId,
    };
  });

  await supabase.from('pixels').upsert(pixelUpdates);

  return res.status(200).json({ ok: true });
}
