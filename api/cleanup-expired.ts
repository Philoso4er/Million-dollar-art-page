import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  try {
    // Fetch expired unpaid orders
    const { data: expired } = await supabase
      .from("orders")
      .select("id")
      .lt("expires_at", new Date().toISOString())
      .eq("status", "pending");

    if (!expired || expired.length === 0) {
      return res.status(200).json({ cleaned: 0 });
    }

    const expiredIds = expired.map((o) => o.id);

    // Release pixels back to free
    await supabase
      .from("pixels")
      .update({ status: "free", order_id: null })
      .in("order_id", expiredIds);

    // Mark orders as expired
    await supabase
      .from("orders")
      .update({ status: "expired" })
      .in("id", expiredIds);

    return res.status(200).json({ cleaned: expiredIds.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
