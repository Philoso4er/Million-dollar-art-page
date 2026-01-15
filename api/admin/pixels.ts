import { supabase } from "../../src/lib/supabase";

export default async function handler(req: any, res: any) {
  const { data } = await supabase
    .from("pixels")
    .select("status");

  const stats = { free: 0, reserved: 0, sold: 0 };

  data.forEach((p: any) => stats[p.status]++);

  res.status(200).json(stats);
}
