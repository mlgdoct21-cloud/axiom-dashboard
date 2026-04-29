import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const result: any = {
    url_prefix: url.slice(0, 30),
    has_key: key.length > 10,
  };

  try {
    const db = createClient(url, key);
    const { data, error } = await (db as any)
      .from('crypto_reports_cache')
      .select('symbol,report_type,expires_at')
      .eq('report_type', 'overview_v3')
      .eq('symbol', 'DOT')
      .single();
    result.db_error = error?.message ?? null;
    result.db_data = data ? { symbol: data.symbol, expires_at: data.expires_at } : null;
  } catch (e: any) {
    result.exception = e?.message;
  }

  return NextResponse.json(result);
}
