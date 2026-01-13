import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  const { status, tx_ref } = req.query;

  if (!tx_ref) return res.status(400).send("Missing tx_ref");

  if (status !== "successful") {
    return res.redirect("/?payment=failed");
  }

  await supabase
    .from("orders")
    .update({ status: "paid" })
    .eq("reference", tx_ref);

  return res.redirect("/?payment=success");
}
