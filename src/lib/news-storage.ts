/**
 * localStorage utilities for News component state persistence
 * Handles votes, favorites, and sentiment data
 */

export interface NewsVote {
  bullish: number;
  bearish: number;
  panic: number;
  userVote?: 'bullish' | 'bearish' | 'panic' | null;
}

export interface NewsVotes {
  [newsId: string]: NewsVote;
}

export interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

// Vote storage
const VOTES_KEY = 'axiom_news_votes';

export const getVotes = (): NewsVotes => {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(VOTES_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.warn('Failed to load votes from localStorage:', error);
    return {};
  }
};

export const saveVotes = (votes: NewsVotes): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
  } catch (error) {
    console.warn('Failed to save votes to localStorage:', error);
  }
};

export const addVote = (
  newsId: string,
  voteType: 'bullish' | 'bearish' | 'panic'
): NewsVotes => {
  const votes = getVotes();
  if (!votes[newsId]) {
    votes[newsId] = { bullish: 0, bearish: 0, panic: 0, userVote: null };
  }

  // Increment the vote count
  votes[newsId][voteType]++;

  // Track user's vote (only one per user per article)
  votes[newsId].userVote = voteType;

  saveVotes(votes);
  return votes;
};

// Favorites storage
const FAVORITES_KEY = 'axiom_favorites';

export const getFavorites = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(FAVORITES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.warn('Failed to load favorites from localStorage:', error);
    return [];
  }
};

export const saveFavorites = (favorites: string[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.warn('Failed to save favorites to localStorage:', error);
  }
};

export const addFavorite = (symbol: string): string[] => {
  const favorites = getFavorites();
  if (!favorites.includes(symbol)) {
    favorites.push(symbol);
    saveFavorites(favorites);
  }
  return favorites;
};

export const removeFavorite = (symbol: string): string[] => {
  const favorites = getFavorites().filter(s => s !== symbol);
  saveFavorites(favorites);
  return favorites;
};

export const isFavorite = (symbol: string): boolean => {
  return getFavorites().includes(symbol);
};

// Last selected category (UX: user'i son kaldigi yerde ac)
const CATEGORY_KEY = 'axiom_news_category';

export type NewsCategoryFilter = 'all' | 'crypto' | 'stocks' | 'forex' | 'economy' | 'general';

export const getLastCategory = (): NewsCategoryFilter => {
  if (typeof window === 'undefined') return 'all';
  try {
    const saved = localStorage.getItem(CATEGORY_KEY);
    return (saved as NewsCategoryFilter) || 'all';
  } catch {
    return 'all';
  }
};

export const saveLastCategory = (cat: NewsCategoryFilter): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CATEGORY_KEY, cat);
  } catch {}
};
