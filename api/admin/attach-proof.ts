import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  const { orderId, proofUrl } = req.body;

  const { error } = await supabase
    .from("orders")
    .update({ payment_proof_url: proofUrl })
    .eq("id", orderId);

  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json({ success: true });
}
