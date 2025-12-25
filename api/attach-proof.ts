import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  const { reference, payment_proof_url, payment_note } = req.body;

  await supabase
    .from('orders')
    .update({ payment_proof_url, payment_note })
    .eq('reference', reference);

  res.status(200).json({ success: true });
}
