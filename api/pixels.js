const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  try {
    // GET PIXEL STATS
    if (action === 'stats' && req.method === 'GET') {
      const { data } = await supabase.from('pixels').select('status');

      const stats = { free: 1000000, reserved: 0, sold: 0 };

      if (data) {
        stats.reserved = data.filter(p => p.status === 'reserved').length;
        stats.sold = data.filter(p => p.status === 'sold').length;
        stats.free = 1000000 - stats.reserved - stats.sold;
      }

      return res.status(200).json(stats);
    }

    // GET ALL PIXELS
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('pixels')
        .select('pixel_id, color, link, status');

      if (error) {
        console.error('Failed to load pixels:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ pixels: data || [] });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message });
  }
};
