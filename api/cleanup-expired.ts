import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  const now = new Date().toISOString();

  // Find expired orders
  const { data: expired } = await supabase
    .from("orders")
    .select("*")
    .lt("expires_at", now)
    .eq("status", "pending");

  if (!expired || expired.length === 0) {
    return res.status(200).json({ cleaned: 0 });
  }

  const ids = expired.map((o) => o.id);

  // Free the pixels
  await supabase
    .from("pixels")
    .update({ status: "free", order_id: null })
    .in("order_id", ids);

  // Delete expired orders
  await supabase.from("orders").delete().in("id", ids);

  return res.status(200).json({ cleaned: ids.length });
}
