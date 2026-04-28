import { Octokit } from '@octokit/rest';

if (!process.env.GITHUB_API_TOKEN) {
  throw new Error('GITHUB_API_TOKEN environment variable is not set');
}

const octokit = new Octokit({ auth: process.env.GITHUB_API_TOKEN });

// Verified active repos as of April 2026
const REPO_MAP: Record<string, { owner: string; repo: string }> = {
  SOL:   { owner: 'anza-xyz',          repo: 'agave' },           // solana-labs/solana archived Jan 2025
  ETH:   { owner: 'ethereum',          repo: 'go-ethereum' },
  BTC:   { owner: 'bitcoin',           repo: 'bitcoin' },
  ARB:   { owner: 'OffchainLabs',      repo: 'nitro' },           // not arbitrum/nitro
  MATIC: { owner: '0xPolygon',         repo: 'bor' },             // maticnetwork/contracts stale
  AVAX:  { owner: 'ava-labs',          repo: 'avalanchego' },
  DOT:   { owner: 'paritytech',        repo: 'polkadot-sdk' },    // paritytech/polkadot archived
  LINK:  { owner: 'smartcontractkit', repo: 'chainlink' },
  UNI:   { owner: 'Uniswap',           repo: 'v4-core' },
  ADA:   { owner: 'IntersectMBO',      repo: 'cardano-node' },    // input-output-hk moved
};

export async function getGitHubRepo(symbol: string) {
  return REPO_MAP[symbol.toUpperCase()] ?? null;
}

export async function getDevHealthMetrics(symbol: string) {
  const repo = await getGitHubRepo(symbol);
  if (!repo) return null;

  const { owner, repo: repoName } = repo;
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch commits + PRs in parallel
  const [commits, prs] = await Promise.all([
    octokit.repos.listCommits({ owner, repo: repoName, per_page: 100, since: since30d }),
    octokit.pulls.list({ owner, repo: repoName, state: 'closed', per_page: 50, sort: 'updated', direction: 'desc' }),
  ]);

  // Count unique authors from recent commits → real "active developers" count
  const uniqueAuthors = new Set(
    commits.data
      .map(c => c.author?.login ?? c.commit.author?.email)
      .filter(Boolean)
  );

  return {
    commits_30d: commits.data.length,
    active_developers: uniqueAuthors.size,
    recent_prs: prs.data.length,
    avg_pr_review_time: calculateAvgReviewTime(prs.data),
    timestamp: new Date().toISOString(),
  };
}

function calculateAvgReviewTime(prs: any[]): number {
  const closed = prs.filter(pr => pr.closed_at);
  if (!closed.length) return 0;
  const totalHours = closed.reduce((sum, pr) => {
    const h = (new Date(pr.closed_at).getTime() - new Date(pr.created_at).getTime()) / 3_600_000;
    return sum + h;
  }, 0);
  return totalHours / closed.length;
}
