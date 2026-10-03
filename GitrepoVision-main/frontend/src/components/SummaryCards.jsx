import React from 'react';

const SummaryCards = ({ data }) => {
  const getRiskColor = (level) => {
    switch (level) {
      case 'Low Risk':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'Moderate Risk':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'High Risk':
        return 'bg-orange-50 border-orange-200 text-orange-900';
      case 'Critical Risk':
        return 'bg-red-50 border-red-200 text-red-900';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-900';
    }
  };

  const getRiskIcon = (level) => {
    switch (level) {
      case 'Low Risk':
        return '✓';
      case 'Moderate Risk':
        return '⚠';
      case 'High Risk':
        return '⚠';
      case 'Critical Risk':
        return '✕';
      default:
        return '○';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Structural Risk Score */}
      <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
        <p className="text-gray-600 text-sm font-medium mb-2">Structural Risk Score</p>
        <p className="text-4xl font-bold text-primary-600 mb-1">{data.structural_risk_score}</p>
        <p className="text-gray-500 text-xs">out of 100</p>
      </div>

      {/* Risk Level */}
      <div className={`rounded-xl shadow-md p-6 border-2 hover:shadow-lg transition-shadow ${getRiskColor(data.risk_level)}`}>
        <p className="text-sm font-medium mb-2 opacity-75">Risk Level</p>
        <p className="text-3xl font-bold mb-1">{getRiskIcon(data.risk_level)}</p>
        <p className="text-lg font-semibold">{data.risk_level}</p>
      </div>

      {/* Total Issues */}
      <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
        <p className="text-gray-600 text-sm font-medium mb-2">Total Issues</p>
        <p className="text-4xl font-bold text-primary-600">{data.total_issues}</p>
        <p className="text-gray-500 text-xs mt-1">found</p>
      </div>

      {/* Files Scanned */}
      <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
        <p className="text-gray-600 text-sm font-medium mb-2">Files Scanned</p>
        <p className="text-4xl font-bold text-teal-600">{data.total_files}</p>
        <p className="text-gray-500 text-xs mt-1">Code files</p>
      </div>
    </div>
  );
};

export default SummaryCards;
