import { createClient } from '@supabase/supabase-js';

// URL is not a secret — NEXT_PUBLIC_* vars are inlined empty when build-time value was absent
const SUPABASE_URL_FALLBACK = 'https://enpaxcwxjuripymboahm.supabase.co';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL_FALLBACK;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing');
  return createClient(url, key);
}

export async function getCachedCryptoReport(reportType: string, symbol: string) {
  try {
    const db = getSupabase();
    const { data, error } = await (db as any)
      .from('crypto_reports_cache')
      .select('report_data')
      .eq('report_type', reportType)
      .eq('symbol', symbol)
      .gt('expires_at', new Date().toISOString())
      .single();
    if (error) { console.error('[cache] read:', error.message, reportType, symbol); return null; }
    return data?.report_data ?? null;
  } catch (e) {
    console.error('[cache] read exception:', e);
    return null;
  }
}

export async function setCachedCryptoReport(reportType: string, symbol: string, data: any, ttlHours: number = 6) {
  try {
    const db = getSupabase();
    const { error } = await (db as any)
      .from('crypto_reports_cache')
      .upsert(
        { report_type: reportType, symbol, report_data: data, expires_at: new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString() },
        { onConflict: 'symbol,report_type' }
      );
    if (error) console.error('[cache] write:', error.message, reportType, symbol);
  } catch (e) {
    console.error('[cache] write exception:', e);
  }
}
