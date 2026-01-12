import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { pixelIds, color, link } = req.body;

    if (!Array.isArray(pixelIds) || pixelIds.length === 0) {
      return res.status(400).json({ error: "Invalid pixel selection" });
    }

    // Fetch selected pixels
    const { data: existing, error: fetchErr } = await supabase
      .from("pixels")
      .select("pixel_id, status")
      .in("pixel_id", pixelIds);

    if (fetchErr) return res.status(500).json({ error: fetchErr.message });

    // Validate availability
    if (existing.some((p: any) => p.status !== "free")) {
      return res.status(409).json({
        error: "Some selected pixels are no longer available",
      });
    }

    // Create reference ID
    const reference = "PIX-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    // 20 min expiration
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    // Create order in DB
    const { data: order, error: insertErr } = await supabase
      .from("orders")
      .insert({
        reference,
        pixel_ids: pixelIds,
        amount_usd: pixelIds.length,
        color,
        link,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (insertErr) {
      return res.status(500).json({ error: insertErr.message });
    }

    // Reserve pixels
    const upsertData = pixelIds.map((id: number) => ({
      pixel_id: id,
      status: "reserved",
      order_id: order.id,
    }));

    const { error: pixelErr } = await supabase.from("pixels").upsert(upsertData);

    if (pixelErr) {
      return res.status(500).json({ error: pixelErr.message });
    }

    // Flutterwave link format: https://flutterwave.com/pay/{reference}
    const flutterwaveUrl = `https://flutterwave.com/pay/${reference}`;

    return res.status(200).json({
      reference,
      checkout: flutterwaveUrl,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
