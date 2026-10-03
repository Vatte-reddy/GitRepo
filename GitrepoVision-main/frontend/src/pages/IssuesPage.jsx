import React from 'react';
import IssuesTable from '../components/IssuesTable';
import { useRepo } from '../context/RepoContext';

const IssuesPage = () => {
  const { analysisData, analysisRepoUrl, sharedUrl } = useRepo();
  const visibleAnalysisData = analysisData && analysisRepoUrl === sharedUrl ? analysisData : null;

  return (
    <div className="min-h-screen bg-gradient-card px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">All Issues</h1>
        <p className="text-gray-500 text-sm mt-1">Detailed issue list with search, filters, and sorting</p>
      </div>

      {visibleAnalysisData ? (
        <IssuesTable data={visibleAnalysisData} repoUrl={sharedUrl} />
      ) : (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center border border-gray-100">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No analysis available</h2>
          <p className="text-gray-500 text-sm">Run a repository analysis from Home to view all issues here.</p>
        </div>
      )}
    </div>
  );
};

export default IssuesPage;
