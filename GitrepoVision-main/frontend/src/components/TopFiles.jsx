import React from 'react';

const TopFiles = ({ data }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-8">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Risky Files</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">File Name</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Issue Count</th>
            </tr>
          </thead>
          <tbody>
            {data.top_risky_files.map((file, idx) => (
              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 text-gray-800 font-mono text-sm break-all">{file.file}</td>
                <td className="py-3 px-4 text-right">
                  <span className="inline-block bg-red-100 text-red-800 font-semibold px-3 py-1 rounded-full text-sm">
                    {file.issue_count}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopFiles;
