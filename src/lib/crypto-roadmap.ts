export interface GitHubRelease {
  tag: string;
  name: string;
  date: string;       // YYYY-MM-DD
  body: string;       // first 400 chars of release notes
}

// GitHub repo mapping per symbol
const REPO_MAP: Record<string, { owner: string; repo: string }> = {
  BTC:  { owner: 'bitcoin',         repo: 'bitcoin' },
  ETH:  { owner: 'ethereum',        repo: 'go-ethereum' },
  SOL:  { owner: 'anza-xyz',        repo: 'agave' },
  ARB:  { owner: 'OffchainLabs',    repo: 'nitro' },
  AVAX: { owner: 'ava-labs',        repo: 'avalanchego' },
  DOT:  { owner: 'paritytech',      repo: 'polkadot-sdk' },
  LINK: { owner: 'smartcontractkit',repo: 'chainlink' },
  UNI:  { owner: 'Uniswap',         repo: 'v4-core' },
  ADA:  { owner: 'IntersectMBO',    repo: 'cardano-node' },
  NEAR: { owner: 'near',            repo: 'nearcore' },
  APT:  { owner: 'aptos-labs',      repo: 'aptos-core' },
  SUI:  { owner: 'MystenLabs',      repo: 'sui' },
};

export async function getGitHubReleases(symbol: string): Promise<GitHubRelease[]> {
  const repo = REPO_MAP[symbol.toUpperCase()];
  if (!repo) return [];

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'AXIOM/1.0',
      Accept: 'application/vnd.github+json',
    };
    if (process.env.GITHUB_API_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_API_TOKEN}`;
    }

    const res = await fetch(
      `https://api.github.com/repos/${repo.owner}/${repo.repo}/releases?per_page=20`,
      { headers, next: { revalidate: 86400 } }  // cache 24h
    );
    if (!res.ok) return [];

    const releases: any[] = await res.json();
    return releases
      .filter(r => r.published_at && !r.draft)
      .map(r => ({
        tag:  r.tag_name ?? '',
        name: r.name ?? r.tag_name ?? '',
        date: (r.published_at ?? '').slice(0, 10),
        body: (r.body ?? '').replace(/[#*`\r]/g, '').replace(/\n+/g, ' ').trim().slice(0, 300),
      }));
  } catch (err) {
    console.error('[crypto-roadmap] GitHub fetch failed:', err);
    return [];
  }
}
