export interface FearGreedData {
  value: number;        // 0-100
  label: string;        // "Extreme Fear" etc
  timestamp: string;
}

export async function getFearGreedIndex(): Promise<FearGreedData | null> {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1', {
      headers: { 'User-Agent': 'AXIOM/1.0' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const item = data?.data?.[0];
    if (!item) return null;
    return {
      value: parseInt(item.value, 10),
      label: item.value_classification,
      timestamp: new Date(parseInt(item.timestamp, 10) * 1000).toISOString(),
    };
  } catch {
    return null;
  }
}
