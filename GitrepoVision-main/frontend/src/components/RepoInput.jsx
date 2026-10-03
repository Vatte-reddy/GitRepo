import React, { useEffect, useState } from 'react';

const RepoInput = ({ onAnalyze, loading, initialUrl = '' }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setUrl(initialUrl || '');
  }, [initialUrl]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('Please enter a GitHub repository URL');
      return;
    }

    let parsed;
    try {
      parsed = new URL(url.trim());
    } catch {
      setError('Please enter a valid GitHub repository URL');
      return;
    }

    if (parsed.hostname !== 'github.com' && parsed.hostname !== 'www.github.com') {
      setError('Please enter a valid GitHub repository URL');
      return;
    }

    onAnalyze(url.trim());
  };

  return (
    <div className="w-full mb-8">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError('');
          }}
          placeholder="Enter GitHub repo URL (e.g., https://github.com/kennethreitz/requests)"
          disabled={loading}
          className="flex-1 px-4 py-3 rounded-lg border-2 border-primary-100 focus:border-primary-500 focus:outline-none transition-all bg-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3 bg-gradient-primary text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
        >
          {loading ? (
            <>
              <div className="spinner" style={{ width: '20px', height: '20px', marginRight: '4px' }}></div>
              Analyzing...
            </>
          ) : (
            'Analyze'
          )}
        </button>
      </form>
      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
    </div>
  );
};

export default RepoInput;
