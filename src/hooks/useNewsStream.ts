'use client';

import { useEffect, useRef } from 'react';

/**
 * Backend'in SSE kanalına (`/api/news/stream` → Next.js proxy → FastAPI `/api/v1/news/stream`)
 * bağlanıp her yeni analizlenen haberi callback ile teslim eder.
 *
 * Backend payload'ı ('event: news'):
 *   {
 *     id: number,
 *     title: string,
 *     link: string,
 *     source: string,
 *     symbol: string | null,
 *     is_urgent: boolean,
 *     telegram_hook: string,
 *     dashboard_summary: string,
 *     axiom_analysis: string,
 *     created_at: string  // ISO
 *   }
 */
export interface StreamedNews {
  id: number;
  title: string;
  link: string;
  source: string;
  symbol: string | null;
  is_urgent: boolean;
  telegram_hook: string;
  dashboard_summary: string;
  axiom_analysis: string;
  created_at: string;
}

export function useNewsStream(
  onNews: (n: StreamedNews) => void,
  enabled: boolean = true
) {
  // onNews'i ref'te tut ki EventSource her değişiklikte yeniden bağlanmasın.
  const onNewsRef = useRef(onNews);
  onNewsRef.current = onNews;

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;

    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 2_000; // exponential backoff başlangıç
    const MAX_RETRY_DELAY = 30_000;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;

      try {
        es = new EventSource('/api/news/stream');
      } catch (e) {
        console.warn('[useNewsStream] EventSource oluşturulamadı', e);
        scheduleRetry();
        return;
      }

      es.addEventListener('ready', () => {
        retryDelay = 2_000; // başarılı bağlantıda reset
      });

      es.addEventListener('news', (evt) => {
        try {
          const data = JSON.parse((evt as MessageEvent).data) as StreamedNews;
          onNewsRef.current(data);
        } catch (e) {
          console.warn('[useNewsStream] news event parse hatası', e);
        }
      });

      es.onerror = () => {
        // EventSource otomatik reconnect yapar ama biz manuel kontrol edelim
        // ki exponential backoff uygulayabilelim.
        if (es) {
          es.close();
          es = null;
        }
        scheduleRetry();
      };
    };

    const scheduleRetry = () => {
      if (cancelled) return;
      retryTimeout = setTimeout(() => {
        retryDelay = Math.min(retryDelay * 1.5, MAX_RETRY_DELAY);
        connect();
      }, retryDelay);
    };

    connect();

    return () => {
      cancelled = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (es) {
        es.close();
        es = null;
      }
    };
  }, [enabled]);
}
