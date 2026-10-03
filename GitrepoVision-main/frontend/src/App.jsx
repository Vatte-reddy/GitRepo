import React, { useState } from 'react';
import Header from './components/Header';
import RepoInput from './components/RepoInput';
import SummaryCards from './components/SummaryCards';
import Charts from './components/Charts';
import TopFiles from './components/TopFiles';
import RepositoryInsights from './components/RepositoryInsights';
import { analyzeRepository } from './utils/axios';
import { useRepo } from './context/RepoContext';

const App = () => {
  const { analysisData, analysisRepoUrl, setAnalysisData, clearAnalysisData, setSharedUrl, sharedUrl } = useRepo();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const visibleAnalysisData = analysisData && analysisRepoUrl === sharedUrl ? analysisData : null;

  const handleAnalyze = async (repoUrl) => {
    setLoading(true);
    setError('');

    try {
      const response = await analyzeRepository(repoUrl);
      setAnalysisData(response.data, repoUrl);
      setSharedUrl(repoUrl);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(
        err.response?.data?.error ||
        'Failed to analyze repository. Please ensure the Flask API is running at http://localhost:5000'
      );
      clearAnalysisData();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Header />
        <RepoInput onAnalyze={handleAnalyze} loading={loading} initialUrl={sharedUrl} />

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-800 px-6 py-4 rounded-xl mb-8">
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-xl shadow-md p-10 text-center mb-8">
            <div className="spinner mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800">Analyzing...</h2>
            <p className="text-gray-600 mt-2">Scanning repository structure, security, and code quality rules.</p>
          </div>
        )}

        {visibleAnalysisData ? (
          <>
            <SummaryCards data={visibleAnalysisData} />
            <RepositoryInsights insights={visibleAnalysisData.repository_insights} />
            <Charts data={visibleAnalysisData} />
            {visibleAnalysisData.top_risky_files && visibleAnalysisData.top_risky_files.length > 0 && <TopFiles data={visibleAnalysisData} />}
          </>
        ) : (
          !error && !loading && (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Ready to Analyze</h2>
              <p className="text-gray-600">
                Enter a GitHub repository URL above to start analyzing code structure, security, and code quality.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default App;
