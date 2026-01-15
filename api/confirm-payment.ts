import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  const secret = process.env.FLW_WEBHOOK_HASH!;
  const signature = req.headers["verif-hash"];

  if (!signature || signature !== secret) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = req.body;

  if (!event?.data?.tx_ref) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const reference = event.data.tx_ref;

  // Mark paid
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("reference", reference)
    .single();

  if (!order) return res.status(404).json({ error: "Order not found" });

  await supabase.from("orders").update({ status: "sold" }).eq("id", order.id);
  await supabase.from("pixels").update({ status: "sold" }).eq("order_id", order.id);

  return res.status(200).json({ success: true });
}
