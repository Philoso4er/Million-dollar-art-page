import { supabase } from "../../src/lib/supabase";

export default async function handler(req: any, res: any) {
  const { orderId } = req.body;

  // Mark order paid
  await supabase
    .from("orders")
    .update({ status: "paid" })
    .eq("id", orderId);

  // Update pixel statuses
  const { data: order } = await supabase
    .from("orders")
    .select("pixel_ids, color, link")
    .eq("id", orderId)
    .single();

  if (!order) return res.status(404).json({ error: "Order not found" });

  await supabase
    .from("pixels")
    .update({ status: "sold", color: order.color, link: order.link })
    .in("pixel_id", order.pixel_ids);

  res.status(200).json({ ok: true });
}
