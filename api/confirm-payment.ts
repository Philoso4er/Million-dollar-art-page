import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

export default async function handler(req: any, res: any) {
  const adminPass = req.headers['x-admin-password'];

  if (adminPass !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'Missing orderId' });

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (!order || order.status !== 'pending') {
    return res.status(400).json({ error: 'Invalid order' });
  }

  // Mark order paid
  await supabase
    .from('orders')
    .update({ status: 'paid' })
    .eq('id', orderId);

  // Finalize pixels
  await supabase
    .from('pixels')
    .update({
      status: 'sold',
      color: order.color,
      link: order.link
    })
    .eq('order_id', orderId);

  // ✉️ SEND EMAIL (if provided)
  if (order.email) {
    await resend.emails.send({
      from: 'Million Pixel Grid <no-reply@yourdomain.com>',
      to: order.email,
      subject: 'Your pixel purchase is confirmed 🎉',
      html: `
        <h2>Payment Confirmed</h2>
        <p>Your payment has been confirmed.</p>
        <p><strong>Reference:</strong> ${order.reference}</p>
        <p><strong>Pixel ID(s):</strong> ${order.pixel_ids.join(', ')}</p>
        <p>Your pixel is now live on the grid.</p>
        <p>Thank you for being part of internet history.</p>
      `
    });
  }

  return res.status(200).json({ success: true });
}
