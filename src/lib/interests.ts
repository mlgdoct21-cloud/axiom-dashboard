// User interest preferences management
export type InterestCategory = 'crypto' | 'stocks' | 'forex' | 'economy';

export interface UserInterests {
  categories: InterestCategory[];
  lastUpdated: number;
}

const INTERESTS_KEY = 'axiom_user_interests';

// Default interests if none saved
const DEFAULT_INTERESTS: UserInterests = {
  categories: ['crypto', 'stocks', 'forex', 'economy'],
  lastUpdated: Date.now(),
};

export function getInterests(): UserInterests {
  if (typeof window === 'undefined') return DEFAULT_INTERESTS;

  try {
    const saved = localStorage.getItem(INTERESTS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load interests:', e);
  }

  return DEFAULT_INTERESTS;
}

export function saveInterests(interests: UserInterests): UserInterests {
  if (typeof window === 'undefined') return interests;

  try {
    const toSave = {
      ...interests,
      lastUpdated: Date.now(),
    };
    localStorage.setItem(INTERESTS_KEY, JSON.stringify(toSave));
    return toSave;
  } catch (e) {
    console.error('Failed to save interests:', e);
    return interests;
  }
}

export function toggleInterest(interest: InterestCategory): UserInterests {
  const current = getInterests();
  const index = current.categories.indexOf(interest);

  let updated: InterestCategory[];
  if (index > -1) {
    updated = current.categories.filter((_, i) => i !== index);
  } else {
    updated = [...current.categories, interest];
  }

  // Always keep at least one interest selected
  if (updated.length === 0) {
    updated = [interest];
  }

  return saveInterests({
    categories: updated,
    lastUpdated: Date.now(),
  });
}

export function setInterests(categories: InterestCategory[]): UserInterests {
  // Always keep at least one interest selected
  const updated = categories.length > 0 ? categories : (['crypto'] as InterestCategory[]);

  return saveInterests({
    categories: updated,
    lastUpdated: Date.now(),
  });
}

export function isInterestSelected(interests: UserInterests, category: string): boolean {
  return interests.categories.includes(category as InterestCategory);
}
