import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { pixelIds, mode, color, link, pixels } = req.body;

    if (!Array.isArray(pixelIds) || pixelIds.length === 0) {
      return res.status(400).json({ error: "Invalid pixel selection" });
    }

    // Check availability
    const { data: existing } = await supabase
      .from("pixels")
      .select("pixel_id, status")
      .in("pixel_id", pixelIds);

    if (existing.some((p: any) => p.status !== "free")) {
      return res
        .status(409)
        .json({ error: "Some selected pixels are already reserved/sold." });
    }

    const reference = "PIX-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    // Store full pixel customization only in individual mode
    const orderInsert = {
      reference,
      pixel_ids: pixelIds,
      amount_usd: pixelIds.length,
      expires_at: expiresAt,
      mode,
      color: mode === "sync" ? color : null,
      link: mode === "sync" ? link : null,
      pixels: mode === "individual" ? pixels : null,
    };

    const { data: order, error: insertErr } = await supabase
      .from("orders")
      .insert(orderInsert)
      .select()
      .single();

    if (insertErr) {
      return res.status(500).json({ error: insertErr.message });
    }

    // Reserve pixels
    const reservationData = pixelIds.map((id: number) => ({
      pixel_id: id,
      status: "reserved",
      order_id: order.id,
    }));

    await supabase.from("pixels").upsert(reservationData);

    // Build Flutterwave Checkout Link
    const checkout = `https://flutterwave.com/pay/${reference}`;

    return res.status(200).json({ reference, checkout });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
