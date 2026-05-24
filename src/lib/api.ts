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
// Opsiyon Akademisi endpoint'leri Railway'e (henüz) push'lanmadıysa lokal backend
// kullanılabilir. Production'da NEXT_PUBLIC_ACADEMY_API_URL set'lenmediği için
// otomatik API_URL'e (Railway) düşer — tek base'e dönülür, hiçbir kod değişikliği
// gerekmez. Lokal dev'de `.env.development.local` içine bu değişken yazılırsa
// sadece /academy/* çağrıları o URL'e gider, geri kalan (news, macro, ticker)
// normal API_URL'i kullanır.
const ACADEMY_API_URL = process.env.NEXT_PUBLIC_ACADEMY_API_URL || API_URL;
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

// --- Opsiyon Akademisi (Faz 1) types ---

export interface AcademyWorkedExample {
  asset?: string;
  symbol?: string;
  scenario?: string;
  spekulasyon_karsiti?: string;
}

export interface AcademyQuizOption {
  text: string;
}

export interface AcademyQuiz {
  question: string;
  options: AcademyQuizOption[];
}

export interface AcademyLesson {
  id: string;
  slug: string;
  title: string;
  learning_objective?: string;
  body?: string;
  worked_examples?: AcademyWorkedExample[];
  horology_link?: string | null;
  horology_note?: string | null;
  quiz?: AcademyQuiz | null;
  glossary_refs?: string[];
  locked: boolean;
  tier_hint?: string;
}

export interface AcademyModule {
  id: string;
  slug: string;
  title: string;
  tagline?: string;
  summary?: string;
  tier_required: 'free' | 'premium' | 'advance';
  duration_min?: number;
  locked: boolean;
  lessons: AcademyLesson[];
}

export interface AcademyScenarioCard {
  id: string;
  market_view: string;
  suggested_strategy: string;
  why: string;
  max_gain: string;
  max_loss: string;
  horology_note?: string;
}

export interface AcademyCurriculum {
  metadata: Record<string, unknown>;
  user_tier: string;
  modules: AcademyModule[];
  scenario_cards: AcademyScenarioCard[];
}

export interface AcademyLessonResponse {
  module_id: string;
  module_title: string;
  lesson: AcademyLesson;
}

export interface AcademyGlossaryEntry {
  slug: string;
  tr?: string;
  intuition?: string;
  one_liner?: string;
  metaphor?: string;
  in_finance?: string;
  pitfall?: string;
  horology?: string;
  use_case?: string;
}

export type AcademyGlossary = Record<string, AcademyGlossaryEntry[] | Record<string, unknown>>;

export interface AcademyGlossarySearchResponse {
  query: string;
  results: (AcademyGlossaryEntry & { section: string })[];
}

export interface AcademyThetaWheelSpec {
  description: string;
  parameters_displayed: { label: string; visual: string }[];
  user_interaction: string[];
  brand_voice?: string;
}

export interface AcademyLiveContext {
  btc_dvol: number | null;
  btc_note: string | null;
  eth_dvol: number | null;
  eth_note: string | null;
  vix: number | null;
  vix_note: string | null;
  generated_at: string;
  stale: boolean;
}

export interface AcademyLiveExamplePayoffPoint {
  price: number;
  pnl: number;
}

export interface AcademyLiveExampleLeg {
  type: 'call' | 'put';
  side: 'long' | 'short';
  strike: number;
  premium: number;
  instrument?: string | null;
}

export interface AcademyLiveExampleMetric {
  label: string;
  value?: number | null;
  display?: string;
  kind: 'loss' | 'gain' | 'neutral';
}

export interface AcademyLiveExampleTeachingStep {
  label: string;
  body: string;
  pnl?: string; // işaretli kâr/zarar metni, örn. '+1.493 $'
}

export interface AcademyLiveExampleTeaching {
  intro: string;
  steps: AcademyLiveExampleTeachingStep[];
  takeaway: string;
}

export interface AcademyLiveExample {
  available: boolean;
  asset?: string;
  strategy?: string;
  data_source?: 'deribit_live' | 'theoretical_fallback';
  spot?: number;
  strike?: number;
  strikes?: number[];
  expiry_days?: number;
  premium_usd?: number;
  net_premium_usd?: number;
  iv_pct?: number | null;
  instrument?: string | null;
  legs?: AcademyLiveExampleLeg[];
  metrics?: AcademyLiveExampleMetric[];
  breakevens?: number[];
  summary?: string;
  teaching?: AcademyLiveExampleTeaching | null;
  // protective-put geriye dönük alanlar
  max_loss_usd?: number;
  breakeven_up_usd?: number;
  protected_floor_usd?: number;
  payoff?: AcademyLiveExamplePayoffPoint[];
  generated_at?: string;
  error?: string;
}

export interface AcademyModuleProgress {
  module_id: string;
  total: number;
  completed: number;
  percent: number;
}

export interface AcademyLessonProgress {
  lesson_id: string;
  quiz_score: number | null;
  attempts: number;
  completed_at: string | null;
  updated_at: string | null;
}

export interface AcademyProgressSummary {
  user_id: number;
  lessons: AcademyLessonProgress[];
  modules: AcademyModuleProgress[];
  total_lessons: number;
  total_completed: number;
}

export interface AcademyProgressSubmitResponse {
  progress: AcademyProgressSummary;
  quiz: {
    correct: boolean;
    feedback: string;
    correct_option_index: number;
  } | null;
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

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    const auth = localStorage.getItem(this.authKey);
    if (!auth) return null;
    try {
      const parsed = JSON.parse(auth);
      return parsed.refresh_token ?? null;
    } catch {
      return null;
    }
  }

  /** Tek bir refresh in-flight olsun — concurrent 401'lerde duplicate refresh
   *  isteği patlamayı önler. Promise döner: success → new access_token, fail → null. */
  private _refreshInFlight: Promise<string | null> | null = null;

  private async tryRefresh(): Promise<string | null> {
    if (this._refreshInFlight) return this._refreshInFlight;
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;

    this._refreshInFlight = (async () => {
      try {
        const res = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data?.access_token) return null;

        // Persist new access token + rotated refresh token (if backend sent one).
        // Sliding-window: yeni refresh_token TTL'i sıfırdan başlar, kullanıcı
        // 30 gün içinde tek refresh yaparsa oturum süresiz uzar.
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem(this.authKey);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              parsed.access_token = data.access_token;
              if (data.refresh_token) parsed.refresh_token = data.refresh_token;
              localStorage.setItem(this.authKey, JSON.stringify(parsed));
            } catch {
              /* corrupt entry — leave alone, next request will fail cleanly */
            }
          }
        }
        return data.access_token as string;
      } catch {
        return null;
      } finally {
        this._refreshInFlight = null;
      }
    })();
    return this._refreshInFlight;
  }

  /** Decode a JWT's `exp` (epoch seconds) WITHOUT verifying the signature.
   *  Client-side heuristic only — used to decide proactive refresh, never to
   *  establish trust (the backend always re-verifies). */
  private _decodeExp(token: string): number | null {
    try {
      const part = token.split('.')[1];
      if (!part) return null;
      const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
      return typeof json.exp === 'number' ? json.exp : null;
    } catch {
      return null;
    }
  }

  /** Returns a valid (non-expired) access token, proactively refreshing via the
   *  refresh_token when the current access token is expired or within 60s of it.
   *  Returns null when there is no token; returns the (possibly stale) token if
   *  refresh is impossible so the caller can still attempt and surface a 401.
   *
   *  Raw-fetch content hooks (corporate synthesis, macro/intel story, quota)
   *  bypass `request()` and therefore miss its 401 auto-refresh. They must call
   *  this first so the Bearer they forward is fresh — otherwise the 24h access
   *  token silently expires and the backend serves locked/free content even
   *  though the user still holds a valid 30-day refresh token. */
  async getValidAccessToken(): Promise<string | null> {
    const token = this.getToken();
    if (!token) return null;
    const exp = this._decodeExp(token);
    const now = Math.floor(Date.now() / 1000);
    if (exp && exp - now > 60) return token; // still valid, >60s headroom
    if (!this.getRefreshToken()) return token; // can't refresh — return as-is
    const refreshed = await this.tryRefresh();
    return refreshed ?? token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Academy endpoint'leri için (varsa) ayrı base — bkz. ACADEMY_API_URL.
    // Lokal dev'de /tr Railway'i, /akademi lokal backend'i kullanabilsin diye.
    const base = endpoint.startsWith('/academy') ? ACADEMY_API_URL : this.baseUrl;
    const url = `${base}${endpoint}`;
    const buildHeaders = (token: string | null) => {
      const h: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> | undefined),
      };
      if (token) h['Authorization'] = `Bearer ${token}`;
      return h;
    };

    let token = this.getToken();
    let response = await fetch(url, { ...options, headers: buildHeaders(token) });

    // Auto-refresh on 401 — access token expired, but refresh_token may still
    // be valid (7 gün). Single retry only; if refresh fails, original 401 stands.
    if (response.status === 401 && this.getRefreshToken()) {
      const newToken = await this.tryRefresh();
      if (newToken) {
        token = newToken;
        response = await fetch(url, { ...options, headers: buildHeaders(token) });
      } else if (typeof window !== 'undefined') {
        // Refresh failed → clear stale auth so UI can prompt re-login
        localStorage.removeItem(this.authKey);
      }
    }

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
    const user = await this.request<UserResponse>('/users/me', {
      method: 'GET',
    });
    // Keep the stored `user` object fresh so client-side tier gates (e.g.
    // MarketHealthCard.readUserTier) reflect the CURRENT tier without forcing
    // a re-login. The login response snapshots tier at login time; if the user
    // is upgraded afterwards that snapshot goes stale until this overwrites it.
    if (typeof window !== 'undefined' && user) {
      try {
        const raw = localStorage.getItem(this.authKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.user = user;
          localStorage.setItem(this.authKey, JSON.stringify(parsed));
        }
      } catch {
        /* corrupt entry — leave alone */
      }
    }
    return user;
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

  // --- Opsiyon Akademisi (Faz 1) ---

  async getAcademyCurriculum(): Promise<AcademyCurriculum> {
    return this.request<AcademyCurriculum>('/academy/curriculum');
  }

  async getAcademyLesson(lessonId: string): Promise<AcademyLessonResponse> {
    return this.request<AcademyLessonResponse>(`/academy/lessons/${lessonId}`);
  }

  async getAcademyGlossary(): Promise<AcademyGlossary> {
    return this.request<AcademyGlossary>('/academy/glossary');
  }

  async searchAcademyGlossary(q: string): Promise<AcademyGlossarySearchResponse> {
    return this.request<AcademyGlossarySearchResponse>(
      `/academy/glossary/search?q=${encodeURIComponent(q)}`,
    );
  }

  async getAcademyScenarioCards(): Promise<{ cards: AcademyScenarioCard[] }> {
    return this.request<{ cards: AcademyScenarioCard[] }>('/academy/scenario-cards');
  }

  async getAcademyThetaWheel(): Promise<AcademyThetaWheelSpec> {
    return this.request<AcademyThetaWheelSpec>('/academy/theta-wheel');
  }

  async submitAcademyProgress(
    lessonId: string,
    quizChoice: number | null,
  ): Promise<AcademyProgressSubmitResponse> {
    return this.request<AcademyProgressSubmitResponse>('/academy/progress', {
      method: 'POST',
      body: JSON.stringify({ lesson_id: lessonId, quiz_choice: quizChoice }),
    });
  }

  async getAcademyProgress(): Promise<AcademyProgressSummary> {
    return this.request<AcademyProgressSummary>('/academy/progress');
  }

  async getAcademyLiveExample(strategy: string, asset: string = 'BTC'): Promise<AcademyLiveExample> {
    return this.request<AcademyLiveExample>(
      `/academy/live-example/${encodeURIComponent(strategy)}?asset=${encodeURIComponent(asset)}`,
    );
  }

  async getAcademyLiveContext(): Promise<AcademyLiveContext> {
    return this.request<AcademyLiveContext>('/academy/context');
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
