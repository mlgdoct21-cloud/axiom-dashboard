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
  const db = getSupabase();

  try {
    const { data, error } = await db
      .from('crypto_reports_cache')
      .select('report_data')
      .eq('report_type', reportType)
      .eq('symbol', symbol)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) return null;

    return (data as any).report_data;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

export async function setCachedCryptoReport(
  reportType: string,
  symbol: string,
  data: any
) {
  const db = getSupabase();

  try {
    await (db.from('crypto_reports_cache') as any).upsert(
      {
        report_type: reportType,
        symbol,
        report_data: data,
        expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
      },
      { onConflict: 'symbol,report_type' }
    );
  } catch (error) {
    console.error('Cache write error:', error);
  }
}
