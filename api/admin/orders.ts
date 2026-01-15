import { supabase } from "../../src/lib/supabase";

export default async function handler(req: any, res: any) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json({ orders: data });
}
