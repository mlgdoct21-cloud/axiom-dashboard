import { createClient } from '@supabase/supabase-js';

// Read inside function — NEXT_PUBLIC_* vars can be empty strings when baked at build time
function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars missing');
  return createClient(url, key);
}

export async function getCachedCryptoReport(
  reportType: string,
  symbol: string
) {
  let db: ReturnType<typeof createClient>;
  try { db = getSupabase(); } catch (e) { console.error('[cache] getSupabase failed:', e); return null; }

  try {
    const { data, error } = await db
      .from('crypto_reports_cache')
      .select('report_data')
      .eq('report_type', reportType)
      .eq('symbol', symbol)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) { console.error('[cache] read error:', error.message, 'type:', reportType, 'symbol:', symbol); return null; }
    if (!data) return null;
    return (data as any).report_data;
  } catch (error) {
    console.error('[cache] read exception:', error);
    return null;
  }
}

export async function setCachedCryptoReport(
  reportType: string,
  symbol: string,
  data: any
) {
  let db: ReturnType<typeof createClient>;
  try { db = getSupabase(); } catch (e) { console.error('[cache] getSupabase failed:', e); return; }

  try {
    const { error } = await (db.from('crypto_reports_cache') as any).upsert(
      {
        report_type: reportType,
        symbol,
        report_data: data,
        expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
      },
      { onConflict: 'symbol,report_type' }
    );
    if (error) console.error('[cache] write error:', error.message, 'type:', reportType, 'symbol:', symbol);
  } catch (error) {
    console.error('[cache] write exception:', error);
  }
}
