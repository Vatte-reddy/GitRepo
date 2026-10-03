import React, { useMemo, useState } from 'react';
import AiFixModal from './AiFixModal';

const IssuesTable = ({ data, repoUrl }) => {
  const [severityFilter, setSeverityFilter] = useState('All');
  const [fileFilter, setFileFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('severity_desc');
  
  const [activeIssue, setActiveIssue] = useState(null);
  const [initialAction, setInitialAction] = useState('explain');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openFixModal = (issue, action) => {
    setActiveIssue(issue);
    setInitialAction(action);
    setIsModalOpen(true);
  };

  const severityRank = { High: 3, Medium: 2, Low: 1 };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-orange-100 text-orange-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (rule) => {
    if (['Long Function', 'Too Many Parameters', 'Deep Nesting', 'High Cyclomatic Complexity'].includes(rule)) {
      return 'bg-blue-50';
    }
    if (['Hardcoded Credential', 'Dangerous Function Usage', 'Bare Except Block'].includes(rule)) {
      return 'bg-red-50';
    }
    return 'bg-amber-50';
  };

  const fileOptions = useMemo(() => {
    const unique = new Set((data.issues || []).map((issue) => issue.file).filter(Boolean));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [data.issues]);

  const filteredAndSortedIssues = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = (data.issues || []).filter((issue) => {
      const matchesSeverity = severityFilter === 'All' || issue.severity === severityFilter;
      const matchesFile = fileFilter === 'All' || issue.file === fileFilter;
      const matchesSearch =
        !normalizedSearch ||
        (issue.rule || '').toLowerCase().includes(normalizedSearch) ||
        (issue.file || '').toLowerCase().includes(normalizedSearch);

      return matchesSeverity && matchesFile && matchesSearch;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'severity_desc') {
        return (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0);
      }
      if (sortBy === 'severity_asc') {
        return (severityRank[a.severity] || 0) - (severityRank[b.severity] || 0);
      }
      if (sortBy === 'file_asc') {
        return (a.file || '').localeCompare(b.file || '');
      }
      if (sortBy === 'file_desc') {
        return (b.file || '').localeCompare(a.file || '');
      }
      return 0;
    });
  }, [data.issues, severityFilter, fileFilter, searchTerm, sortBy]);

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">All Issues</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search rules or files"
          className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="All">All Severities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <select
          value={fileFilter}
          onChange={(e) => setFileFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="All">All Files</option>
          {fileOptions.map((file) => (
            <option key={file} value={file}>
              {file}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="severity_desc">Sort: Severity (High to Low)</option>
          <option value="severity_asc">Sort: Severity (Low to High)</option>
          <option value="file_asc">Sort: File (A to Z)</option>
          <option value="file_desc">Sort: File (Z to A)</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">File</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Rule</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Severity</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Line</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Function</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedIssues.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 px-4 text-center text-gray-500">
                  {data.issues.length === 0 ? 'Looks clean!' : 'No matching issues for the current filters.'}
                </td>
              </tr>
            ) : (
              filteredAndSortedIssues.map((issue, idx) => (
                <tr key={idx} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${getCategoryColor(issue.rule)}`}>
                  <td className="py-3 px-4 text-gray-800 font-mono text-sm max-w-xs truncate">{issue.file}</td>
                  <td className="py-3 px-4 text-gray-800">{issue.rule}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block ${getSeverityColor(issue.severity)} px-3 py-1 rounded-full text-xs font-semibold`}>
                      {issue.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-gray-700 font-mono">{issue.line}</td>
                  <td className="py-3 px-4 text-gray-700 text-sm">{issue.function || '-'}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex justify-center space-x-2">
                      <button 
                        onClick={() => openFixModal(issue, 'explain')}
                        title="View AI Explanation"
                        className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                      >
                        Explain
                      </button>
                      <button 
                        onClick={() => openFixModal(issue, 'suggest')}
                        title="View AI Suggestion"
                        className="text-xs bg-purple-50 text-purple-600 hover:bg-purple-100 px-2 py-1 rounded transition-colors"
                      >
                        Suggest
                      </button>
                      <button 
                        onClick={() => openFixModal(issue, 'fix')}
                        className="text-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 px-2 py-1 rounded transition-colors font-medium flex items-center"
                      >
                        <span className="mr-1">✨</span> Auto Fix
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {filteredAndSortedIssues.length > 0 && (
        <p className="mt-4 text-sm text-gray-500 text-center">
          Showing {filteredAndSortedIssues.length} of {data.issues.length} issue{data.issues.length !== 1 ? 's' : ''}
        </p>
      )}
      
      <AiFixModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        issue={activeIssue}
        repoUrl={repoUrl}
        initialAction={initialAction}
      />
    </div>
  );
};

export default IssuesTable;
