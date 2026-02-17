import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Simple multipart parser without external deps
async function parseFormData(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const boundary = req.headers['content-type']?.split('boundary=')[1];
      if (!boundary) return reject(new Error('No boundary found'));

      const parts = buffer.toString('binary').split('--' + boundary);
      const result = { fields: {}, files: {} };

      for (const part of parts) {
        if (part === '--\r\n' || part.trim() === '--') continue;
        const [rawHeaders, ...bodyParts] = part.split('\r\n\r\n');
        if (!rawHeaders) continue;
        const body = bodyParts.join('\r\n\r\n').replace(/\r\n$/, '');

        const nameMatch = rawHeaders.match(/name="([^"]+)"/);
        const filenameMatch = rawHeaders.match(/filename="([^"]+)"/);

        if (!nameMatch) continue;
        const fieldName = nameMatch[1];

        if (filenameMatch) {
          const filename = filenameMatch[1];
          const contentTypeMatch = rawHeaders.match(/Content-Type: ([^\r\n]+)/);
          const contentType = contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream';
          result.files[fieldName] = {
            filename,
            contentType,
            buffer: Buffer.from(body, 'binary'),
          };
        } else {
          result.fields[fieldName] = body;
        }
      }

      resolve(result);
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Server configuration error: missing ' + (!SUPABASE_URL ? 'SUPABASE_URL' : 'SUPABASE_SERVICE_ROLE_KEY') });
  }

  const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  try {
    const { fields, files } = await parseFormData(req);
    const reference = fields.reference;
    const proofFile = files.proof;

    if (!reference || !proofFile) {
      return res.status(400).json({ error: 'Missing reference or proof file' });
    }

    // Verify the order exists
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('reference', reference)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Order is not pending' });
    }

    // Upload to Supabase Storage
    const filename = `proof-${reference}-${Date.now()}.${proofFile.filename.split('.').pop()}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(filename, proofFile.buffer, {
        contentType: proofFile.contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      // If bucket doesn't exist, store the reference note in the order anyway
      await supabase
        .from('orders')
        .update({ payment_proof_url: `PENDING_UPLOAD: ${reference}` })
        .eq('id', order.id);

      return res.status(200).json({ ok: true, note: 'Proof noted, file storage unavailable' });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('payment-proofs')
      .getPublicUrl(filename);

    // Update the order with the proof URL
    await supabase
      .from('orders')
      .update({ payment_proof_url: urlData.publicUrl })
      .eq('id', order.id);

    return res.status(200).json({ ok: true, url: urlData.publicUrl });
  } catch (err) {
    console.error('Upload proof error:', err);
    return res.status(500).json({ error: err.message });
  }
}
