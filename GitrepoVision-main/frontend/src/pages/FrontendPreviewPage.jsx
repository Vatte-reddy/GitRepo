import React from 'react';
import FrontendPreview from '../components/FrontendPreview';
import { useRepo } from '../context/RepoContext';

const FrontendPreviewPage = () => {
  const { analysisData, analysisRepoUrl, sharedUrl } = useRepo();
  const visibleAnalysisData = analysisData && analysisRepoUrl === sharedUrl ? analysisData : null;

  return (
    <div className="min-h-screen bg-gradient-card px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Frontend Preview</h1>
        <p className="text-gray-500 text-sm mt-1">Live preview and run instructions for detected frontend repositories</p>
      </div>

      {visibleAnalysisData ? (
        <FrontendPreview previewData={visibleAnalysisData.frontend_preview} />
      ) : (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center border border-gray-100">
          <div className="text-6xl mb-4">🖥️</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No preview data yet</h2>
          <p className="text-gray-500 text-sm">Run analysis from Home to generate frontend preview metadata.</p>
        </div>
      )}
    </div>
  );
};

export default FrontendPreviewPage;
