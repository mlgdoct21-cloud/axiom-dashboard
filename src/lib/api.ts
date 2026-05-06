// Production-safe fallback: if NEXT_PUBLIC_API_URL is missing in the Vercel
// build (which happened on the active `axiom-dashboard` project — only the
// stale `-sigma` project had the env set), the client would try
// http://localhost:8000 from end-user devices, fail, and useAuth would log
// out → /auth/login redirect loop. This bug was masked by Day 18's
// ALLOW_PUBLIC_DASHBOARD_LOGIN bypass; uncovered when we tested the real
// /login deep-link flow on Day 21.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? 'https://vivacious-growth-production-4875.up.railway.app/api/v1'
    : 'http://localhost:8000/api/v1');
const AUTH_KEY = process.env.NEXT_PUBLIC_AUTH_STORAGE_KEY || 'axiom_auth';

export type UserTier = 'free' | 'premium' | 'advance';

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: {
    id: number;
    telegram_id: string;
    username: string;
    tier?: UserTier;
  };
}

export interface UserResponse {
  id: number;
  telegram_id: string;
  username: string;
  is_active: boolean;
  tier: UserTier;
  tags: string;
  report_mode: string;
  report_hours: string;
  custom_follows: string;
  subscription_status: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface QuotaHistoryItem {
  command: string;
  used_at: string;
}

export interface QuotaHistoryResponse {
  days: number;
  total: number;
  items: QuotaHistoryItem[];
}

export interface NewsResponse {
  id: number;
  title: string;
  summary: string;
  source: string;
  original_link: string;
  tags: string;
  created_at: string;
  updated_at: string;
}

// Portfolio Interfaces
export interface PortfolioResponse {
  id: number;
  user_id: number;
  name: string;
  currency: string;
  initial_balance: number;
  current_balance: number;
  created_at: string;
  updated_at: string;
}

export interface PortfolioWithStats extends PortfolioResponse {
  total_value: number;
  total_pnl: number;
  total_pnl_percent: number;
}

export interface PortfolioList {
  total: number;
  portfolios: PortfolioResponse[];
}

// Position Interfaces
export interface PositionResponse {
  id: number;
  portfolio_id: number;
  symbol: string;
  quantity: number;
  average_entry_price: number;
  current_price: number;
  entry_date: string;
  exit_date: string | null;
  status: string;
  created_at: string;
}

export interface PositionWithPnL extends PositionResponse {
  pnl_amount: number;
  pnl_percent: number;
}

export interface PositionList {
  total: number;
  positions: PositionWithPnL[];
}

// Signal History Interfaces
export interface SignalHistoryResponse {
  id: number;
  user_id: number;
  symbol: string;
  signal_type: string;
  confidence: number;
  reasoning: string;
  indicators: Record<string, any>;
  price_at_signal: number;
  timestamp: string;
  action_taken: boolean;
  position_id: number | null;
}

export interface SignalHistoryList {
  total: number;
  signals: SignalHistoryResponse[];
}

export interface SignalStats {
  total_signals: number;
  buy_signals: number;
  sell_signals: number;
  hold_signals: number;
  acted_upon: number;
  win_rate: number;
  avg_confidence: number;
  most_traded_symbol: string | null;
}

class ApiClient {
  private baseUrl: string;
  private authKey: string;

  constructor() {
    this.baseUrl = API_URL;
    this.authKey = AUTH_KEY;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    const auth = localStorage.getItem(this.authKey);
    if (!auth) return null;
    try {
      const parsed = JSON.parse(auth);
      return parsed.access_token;
    } catch {
      return null;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: any = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `API error: ${response.status}`);
    }

    return response.json();
  }

  // Auth Methods
  async register(telegramId: string, username: string): Promise<UserResponse> {
    const response = await this.request<UserResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        telegram_id: telegramId,
        username,
      }),
    });
    return response;
  }

  async login(telegramId: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        telegram_id: telegramId,
      }),
    });

    // Save auth data
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.authKey, JSON.stringify(response));
    }

    return response;
  }

  async refreshToken(refreshToken: string): Promise<{ access_token: string; token_type: string }> {
    const response = await this.request<{ access_token: string; token_type: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });

    // Update auth data with new token
    if (typeof window !== 'undefined') {
      const auth = localStorage.getItem(this.authKey);
      if (auth) {
        const parsed = JSON.parse(auth);
        parsed.access_token = response.access_token;
        localStorage.setItem(this.authKey, JSON.stringify(parsed));
      }
    }

    return response;
  }

  async logout(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.authKey);
    }
  }

  async getCurrentUser(): Promise<UserResponse> {
    return this.request<UserResponse>('/users/me', {
      method: 'GET',
    });
  }

  // User Methods
  async updateSettings(settings: {
    tags?: string;
    report_mode?: string;
    report_hours?: string;
    custom_follows?: string;
  }): Promise<UserResponse> {
    return this.request<UserResponse>('/users/me/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async getSettings(): Promise<UserResponse> {
    return this.request<UserResponse>('/users/me/settings', {
      method: 'GET',
    });
  }

  // Billing Methods
  async createCustomerPortalSession(): Promise<{ url: string }> {
    return this.request<{ url: string }>('/billing/customer-portal', {
      method: 'POST',
    });
  }

  async getQuotaHistory(days: number = 7): Promise<QuotaHistoryResponse> {
    return this.request<QuotaHistoryResponse>(
      `/feature-quota/history?days=${days}`,
      { method: 'GET' }
    );
  }

  // News Methods
  async getNews(skip: number = 0, limit: number = 10): Promise<NewsResponse[]> {
    return this.request<NewsResponse[]>(
      `/news?skip=${skip}&limit=${limit}`,
      { method: 'GET' }
    );
  }

  async getLatestNews(limit: number = 10): Promise<NewsResponse[]> {
    return this.request<NewsResponse[]>(
      `/news/latest?limit=${limit}`,
      { method: 'GET' }
    );
  }

  async searchNews(query: string, limit: number = 10): Promise<NewsResponse[]> {
    return this.request<NewsResponse[]>(
      `/news/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      { method: 'GET' }
    );
  }

  async getNewsBySource(source: string, limit: number = 10): Promise<NewsResponse[]> {
    return this.request<NewsResponse[]>(
      `/news/source/${encodeURIComponent(source)}?limit=${limit}`,
      { method: 'GET' }
    );
  }

  async getNewsByTag(tag: string, limit: number = 10): Promise<NewsResponse[]> {
    return this.request<NewsResponse[]>(
      `/news/tag/${encodeURIComponent(tag)}?limit=${limit}`,
      { method: 'GET' }
    );
  }

  // Portfolio Methods
  async createPortfolio(data: {
    name: string;
    currency?: string;
    initial_balance: number;
  }): Promise<PortfolioResponse> {
    return this.request<PortfolioResponse>('/portfolios', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPortfolios(skip: number = 0, limit: number = 100): Promise<PortfolioList> {
    return this.request<PortfolioList>(
      `/portfolios?skip=${skip}&limit=${limit}`,
      { method: 'GET' }
    );
  }

  async getPortfolio(portfolioId: number): Promise<PortfolioWithStats> {
    return this.request<PortfolioWithStats>(`/portfolios/${portfolioId}`, {
      method: 'GET',
    });
  }

  async updatePortfolio(
    portfolioId: number,
    data: { name?: string; currency?: string }
  ): Promise<PortfolioResponse> {
    return this.request<PortfolioResponse>(`/portfolios/${portfolioId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePortfolio(portfolioId: number): Promise<void> {
    return this.request<void>(`/portfolios/${portfolioId}`, {
      method: 'DELETE',
    });
  }

  async getPortfolioStats(portfolioId: number): Promise<{
    total_value: number;
    total_pnl: number;
    total_pnl_percent: number;
  }> {
    return this.request(`/portfolios/${portfolioId}/stats`, {
      method: 'GET',
    });
  }

  // Position Methods
  async openPosition(
    portfolioId: number,
    data: {
      symbol: string;
      quantity: number;
      average_entry_price: number;
      entry_date?: string;
    }
  ): Promise<PositionResponse> {
    return this.request<PositionResponse>(
      `/portfolios/${portfolioId}/positions`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async getPositions(
    portfolioId: number,
    statusFilter?: string,
    skip: number = 0,
    limit: number = 100
  ): Promise<PositionList> {
    const params = new URLSearchParams();
    if (statusFilter) params.append('status_filter', statusFilter);
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());

    return this.request<PositionList>(
      `/portfolios/${portfolioId}/positions?${params.toString()}`,
      { method: 'GET' }
    );
  }

  async getPosition(portfolioId: number, positionId: number): Promise<PositionWithPnL> {
    return this.request<PositionWithPnL>(
      `/portfolios/${portfolioId}/positions/${positionId}`,
      { method: 'GET' }
    );
  }

  async updatePositionPrice(
    portfolioId: number,
    positionId: number,
    currentPrice: number
  ): Promise<PositionResponse> {
    return this.request<PositionResponse>(
      `/portfolios/${portfolioId}/positions/${positionId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ current_price: currentPrice }),
      }
    );
  }

  async closePosition(
    portfolioId: number,
    positionId: number,
    data: { exit_price?: number; exit_date?: string }
  ): Promise<PositionResponse> {
    return this.request<PositionResponse>(
      `/portfolios/${portfolioId}/positions/${positionId}/close`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async deletePosition(portfolioId: number, positionId: number): Promise<void> {
    return this.request<void>(
      `/portfolios/${portfolioId}/positions/${positionId}`,
      { method: 'DELETE' }
    );
  }

  // Signal History Methods
  async getSignalHistory(
    symbol?: string,
    limit: number = 100,
    skip: number = 0
  ): Promise<SignalHistoryList> {
    const params = new URLSearchParams();
    if (symbol) params.append('symbol', symbol);
    params.append('limit', limit.toString());
    params.append('skip', skip.toString());

    return this.request<SignalHistoryList>(
      `/signal-history?${params.toString()}`,
      { method: 'GET' }
    );
  }

  async getSignalsBySymbol(
    symbol: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<SignalHistoryList> {
    return this.request<SignalHistoryList>(
      `/signal-history/symbol/${symbol}?limit=${limit}&skip=${skip}`,
      { method: 'GET' }
    );
  }

  async getSignalStats(): Promise<SignalStats> {
    return this.request<SignalStats>('/signal-history/stats', {
      method: 'GET',
    });
  }

  async markSignalAction(
    signalId: number,
    actionTaken: boolean
  ): Promise<SignalHistoryResponse> {
    return this.request<SignalHistoryResponse>(
      `/signal-history/${signalId}/action`,
      {
        method: 'POST',
        body: JSON.stringify({ action_taken: actionTaken }),
      }
    );
  }

  async linkSignalToPosition(
    signalId: number,
    positionId: number
  ): Promise<SignalHistoryResponse> {
    return this.request<SignalHistoryResponse>(
      `/signal-history/${signalId}/link-position`,
      {
        method: 'POST',
        body: JSON.stringify({ position_id: positionId }),
      }
    );
  }

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(this.authKey);
  }

  getAuthData() {
    if (typeof window === 'undefined') return null;
    const auth = localStorage.getItem(this.authKey);
    return auth ? JSON.parse(auth) : null;
  }
}

export const apiClient = new ApiClient();
