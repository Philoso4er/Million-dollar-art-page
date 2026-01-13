import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  // Flutterwave webhooks must be POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Flutterwave signature validation
  const signature = req.headers["verif-hash"];
  const secret = process.env.FLW_SECRET_KEY;

  if (!secret) {
    return res.status(500).json({ error: "FLW_SECRET_KEY not configured" });
  }

  if (!signature || signature !== secret) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = req.body;

  // Flutterwave sends many event types
  if (event.event !== "charge.completed") {
    return res.status(200).json({ message: "Ignored event" });
  }

  try {
    const txRef = event.data.tx_ref; // Example: PIX-ABC123
    const flwStatus = event.data.status;

    if (!txRef) {
      return res.status(400).json({ error: "Missing tx_ref" });
    }

    // Look up order by reference
    const { data: order, error: findErr } = await supabase
      .from("orders")
      .select("*")
      .eq("reference", txRef)
      .single();

    if (findErr || !order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Ignore if already paid
    if (order.status === "paid") {
      return res.status(200).json({ message: "Already processed" });
    }

    // Only process successful payments
    if (flwStatus !== "successful") {
      return res.status(400).json({ error: "Payment not successful" });
    }

    // Mark order as PAID
    await supabase
      .from("orders")
      .update({
        status: "paid",
        payment_note: `FLW TX: ${event.data.id}`,
        payment_proof_url: event.data.flw_ref,
      })
      .eq("id", order.id);

    // Convert pixel reservations → sold
    await supabase
      .from("pixels")
      .update({
        status: "sold",
        color: order.color,
        link: order.link,
      })
      .in("pixel_id", order.pixel_ids);

    return res.status(200).json({ message: "Payment confirmed" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
