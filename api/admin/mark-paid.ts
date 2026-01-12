import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  const { orderId } = req.body;

  // Update order
  const { error: orderErr } = await supabase
    .from("orders")
    .update({ status: "paid" })
    .eq("id", orderId);

  if (orderErr) return res.status(500).json({ error: orderErr.message });

  // Update pixels
  const { error: pixelErr } = await supabase
    .from("pixels")
    .update({ status: "sold" })
    .eq("order_id", orderId);

  if (pixelErr) return res.status(500).json({ error: pixelErr.message });

  return res.status(200).json({ success: true });
}
