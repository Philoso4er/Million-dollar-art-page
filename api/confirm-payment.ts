import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { reference } = req.body;

  if (!reference) {
    return res.status(400).json({ error: "Missing order reference" });
  }

  try {
    // Fetch order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("reference", reference)
      .single();

    if (orderErr || !order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Update order status
    await supabase
      .from("orders")
      .update({ status: "paid" })
      .eq("id", order.id);

    // Mark pixels as sold
    await supabase
      .from("pixels")
      .update({ status: "sold" })
      .eq("order_id", order.id);

    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
