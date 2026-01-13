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
    const { pixelIds, color, link } = req.body;

    if (!pixelIds || pixelIds.length === 0) {
      return res.status(400).json({ error: "Invalid pixel selection" });
    }

    // Check pixel availability
    const { data: existing, error: checkErr } = await supabase
      .from("pixels")
      .select("pixel_id, status")
      .in("pixel_id", pixelIds);

    if (checkErr) return res.status(500).json({ error: checkErr.message });

    if (existing.some((p: any) => p.status !== "free")) {
      return res.status(409).json({ error: "Pixels unavailable" });
    }

    const reference = "PIX-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    // Create order in Supabase
    const { data: order, error: orderErr } = await supabase
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

    if (orderErr) return res.status(500).json({ error: orderErr.message });

    // Reserve pixels
    await supabase.from("pixels").upsert(
      pixelIds.map((id: number) => ({
        pixel_id: id,
        status: "reserved",
        order_id: order.id,
      }))
    );

    // --- FLUTTERWAVE PAYMENT REQUEST ---
    const flwRes = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: reference,
        amount: pixelIds.length,
        currency: "USD",
        redirect_url: "https://yourdomain.com/api/confirm-payment",
        customer: {
          email: "buyer@placeholder.com",
        },
        customizations: {
          title: "Pixel Purchase",
          description: `Buying ${pixelIds.length} pixels`,
        },
      }),
    });

    const flwJson = await flwRes.json();

    if (!flwJson?.data?.link) {
      return res.status(500).json({ error: "Flutterwave failed", detail: flwJson });
    }

    return res.status(200).json({
      reference,
      checkout: flwJson.data.link, // REAL PAYMENT LINK
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
