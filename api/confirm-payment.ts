import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const payload = req.body;
  const event = payload.event;

  // Expected payment success event
  if (event !== "charge.completed") {
    return res.status(200).json({ message: "Ignored non-payment webhook" });
  }

  const tx = payload.data;
  const reference = tx.tx_ref;

  console.log("Webhook received for reference:", reference);

  if (!reference) {
    return res.status(400).json({ error: "Missing reference" });
  }

  // Fetch matching order
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, pixel_ids, status")
    .eq("reference", reference)
    .single();

  if (orderErr || !order) {
    console.log("Order not found for reference:", reference);
    return res.status(404).json({ error: "Order not found" });
  }

  // Ignore duplicates
  if (order.status === "paid") {
    return res.status(200).json({ message: "Already processed" });
  }

  // Mark order as paid
  const { error: updateErr } = await supabase
    .from("orders")
    .update({ status: "paid" })
    .eq("id", order.id);

  if (updateErr) {
    return res.status(500).json({ error: updateErr.message });
  }

  // Mark pixels as sold and attach final color + link
  const upsertData = order.pixel_ids.map((pixelId: number) => ({
    pixel_id: pixelId,
    status: "sold",
    order_id: order.id,
  }));

  await supabase.from("pixels").upsert(upsertData);

  return res.status(200).json({ message: "Payment confirmed" });
}
