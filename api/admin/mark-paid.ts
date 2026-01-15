import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).end();

  const { id } = req.body;

  // Mark order as sold
  await supabase
    .from("orders")
    .update({ status: "sold" })
    .eq("id", id);

  // Mark pixels as sold
  await supabase
    .from("pixels")
    .update({ status: "sold" })
    .eq("order_id", id);

  return res.status(200).json({ success: true });
}
