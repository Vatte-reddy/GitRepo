import React from 'react';
import RepoTreeViewer from '../components/RepoTreeViewer';
import { useRepo } from '../context/RepoContext';

const TreePage = () => {
  const { sharedUrl } = useRepo();

  return (
    <div className="min-h-screen bg-gradient-card px-6 py-8">
      {/* Page heading */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">🌳 Tree Explorer</h1>
        <p className="text-gray-500 text-sm mt-1">Project structure is automatically loaded from the repository analyzed on Home.</p>
      </div>

      {/* Tree viewer or placeholder */}
      {sharedUrl ? (
        <RepoTreeViewer repoUrl={sharedUrl} />
      ) : (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center border border-gray-100">
          <div className="text-6xl mb-4">🌿</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No repository selected</h2>
          <p className="text-gray-500 text-sm">Run analysis from Home first. Tree Explorer will use that same repository URL automatically.</p>
        </div>
      )}
    </div>
  );
};

export default TreePage;
