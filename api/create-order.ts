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

    // Check availability
    const { data: existing } = await supabase
      .from("pixels")
      .select("pixel_id, status")
      .in("pixel_id", pixelIds);

    if (existing.some((p: any) => p.status !== "free")) {
      return res.status(409).json({ error: "Some pixels unavailable" });
    }

    const reference = "PIX-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    // Create order
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        reference,
        pixel_ids: pixelIds,
        amount_usd: pixelIds.length,
        color,
        link,
        expires_at: expiresAt
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Reserve pixels
    await supabase.from("pixels").upsert(
      pixelIds.map((id: number) => ({
        pixel_id: id,
        status: "reserved",
        order_id: order.id
      }))
    );

    return res.status(200).json({ reference });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
