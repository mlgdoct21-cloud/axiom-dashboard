'use client';

import { useEffect } from 'react';

export default function ReportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[report/error]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-[#e0e0e0] p-6">
      <div className="max-w-2xl mx-auto bg-[#141425] border border-red-500/40 rounded-lg p-5">
        <h1 className="text-red-400 text-xl font-bold mb-2">Rapor sayfası hatası</h1>
        <p className="text-[#8888a0] text-sm mb-3">
          Aşağıdaki hata istemci tarafında oluştu. Ekran görüntüsünü paylaş.
        </p>
        <pre className="text-xs bg-[#0d0d1a] border border-[#2a2a3e] rounded p-3 overflow-auto text-[#ffb347] whitespace-pre-wrap break-words">
          {error.name}: {error.message}
          {error.digest ? `\n\ndigest: ${error.digest}` : ''}
          {error.stack ? `\n\n${error.stack}` : ''}
        </pre>
        <div className="flex gap-2 mt-4">
          <button
            onClick={reset}
            className="px-4 py-2 bg-[#4fc3f7] text-[#0d0d1a] font-semibold rounded text-sm"
          >
            Tekrar Dene
          </button>
          <a
            href="/tr"
            className="px-4 py-2 border border-[#2a2a3e] text-[#e0e0e0] rounded text-sm"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
