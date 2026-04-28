// GitHub dev health metrics
import { Octokit } from '@octokit/rest';

if (!process.env.GITHUB_API_TOKEN) {
  throw new Error('GITHUB_API_TOKEN environment variable is not set');
}

const octokit = new Octokit({
  auth: process.env.GITHUB_API_TOKEN
});

export async function getGitHubRepo(symbol: string) {
  // Map symbol to GitHub repo
  const repoMap: Record<string, { owner: string; repo: string }> = {
    SOL: { owner: 'solana-labs', repo: 'solana' },
    ARB: { owner: 'arbitrum', repo: 'nitro' },
    ETH: { owner: 'ethereum', repo: 'go-ethereum' },
    MATIC: { owner: 'maticnetwork', repo: 'contracts' },
    // Add more...
  };

  return repoMap[symbol.toUpperCase()];
}

export async function getDevHealthMetrics(symbol: string) {
  const repo = await getGitHubRepo(symbol);
  if (!repo) return null;

  const { owner, repo: repoName } = repo;

  // Get commits
  const commits = await octokit.repos.listCommits({
    owner,
    repo: repoName,
    per_page: 100,
    since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  });

  // Get contributors
  const contributors = await octokit.repos.listContributors({
    owner,
    repo: repoName,
    per_page: 100
  });

  // Get pull requests
  const prs = await octokit.pulls.list({
    owner,
    repo: repoName,
    state: 'closed',
    per_page: 50,
    sort: 'updated',
    direction: 'desc'
  });

  return {
    commits_30d: commits.data.length,
    active_developers: contributors.data.length,
    recent_prs: prs.data.length,
    avg_pr_review_time: calculateAvgReviewTime(prs.data),
    timestamp: new Date().toISOString()
  };
}

function calculateAvgReviewTime(prs: any[]) {
  if (!prs.length) return 0;

  const times = prs
    .filter(pr => pr.closed_at)
    .map(pr => {
      const created = new Date(pr.created_at);
      const closed = new Date(pr.closed_at);
      return (closed.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
    });

  return times.reduce((a, b) => a + b, 0) / times.length;
}
