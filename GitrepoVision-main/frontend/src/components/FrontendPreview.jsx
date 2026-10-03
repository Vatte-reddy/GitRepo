import React, { useMemo, useState } from 'react';
import { ExternalLink, LoaderCircle, TerminalSquare } from 'lucide-react';

const StatusBadge = () => {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
      🟢 Preview Available
    </span>
  );
};

const FrontendPreview = ({ previewData }) => {
  const [viewMode, setViewMode] = useState('preview');
  const [iframeLoading, setIframeLoading] = useState(true);

  const commands = useMemo(() => {
    if (!previewData) return [];
    return ['npm install', 'npm start'];
  }, [previewData]);

  if (!previewData) {
    return null;
  }

  const iframeSrc = previewData.previewUrl;
  const canEmbedPreview = Boolean(iframeSrc);

  return (
    <div className="rounded-2xl shadow-md border border-sky-100 bg-white p-6 mb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Frontend Preview</h3>
          <p className="text-sm text-gray-500 mt-1">Live preview where supported, safe fallback otherwise</p>
        </div>

        <StatusBadge />
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setViewMode('preview')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'preview' ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Preview
        </button>
        <button
          onClick={() => setViewMode('instructions')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'instructions' ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Instructions
        </button>
      </div>

      {viewMode === 'preview' ? (
        <div>
          {canEmbedPreview ? (
            <div>
              <p className="text-xs text-gray-500 mb-2">May take a few seconds to load</p>

              <div className="relative border border-gray-200 rounded-xl overflow-hidden" style={{ minHeight: 500 }}>
                {iframeLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
                    <LoaderCircle className="animate-spin text-sky-600" size={28} />
                    <p className="text-sm text-gray-500 mt-2">Loading preview...</p>
                  </div>
                )}

                <iframe
                  title="Frontend Preview"
                  src={iframeSrc}
                  className="w-full h-[500px]"
                  onLoad={() => setIframeLoading(false)}
                  onError={() => setIframeLoading(false)}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              </div>

              <div className="mt-3">
                <a
                  href={previewData.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 transition-colors"
                >
                  <ExternalLink size={16} />
                  Open Preview
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800">
              <p className="font-semibold">⚠️ Open this frontend in a browser workspace.</p>
              <p className="text-sm mt-1">This source repository needs its dependencies and Vite dev server. Open it in StackBlitz to run it.</p>
              <a
                href={previewData.stackblitzUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 mt-3 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 transition-colors"
              >
                <ExternalLink size={16} />
                Open in StackBlitz
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-900 text-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2 text-sky-300">
            <TerminalSquare size={16} />
            <p className="text-sm font-medium">Setup Instructions</p>
          </div>
          <pre className="text-sm overflow-x-auto">{commands.map((cmd) => `$ ${cmd}`).join('\n')}</pre>
        </div>
      )}
    </div>
  );
};

export default FrontendPreview;
