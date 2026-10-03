import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const Charts = ({ data }) => {
  const categoryData = [
    { name: 'Maintainability', value: data.category_breakdown.Maintainability },
    { name: 'Security', value: data.category_breakdown.Security },
    { name: 'Code Smell', value: data.category_breakdown['Code Smell'] },
  ];

  const severityData = [
    { name: 'High', value: data.severity_breakdown.High },
    { name: 'Medium', value: data.severity_breakdown.Medium },
    { name: 'Low', value: data.severity_breakdown.Low },
  ];

  const CATEGORY_COLORS = ['#3b82f6', '#ef4444', '#f59e0b'];
  const SEVERITY_COLORS = ['#dc2626', '#f59e0b', '#10b981'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Category Pie Chart */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Category Breakdown</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={categoryData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.name}: ${entry.value}`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Severity Bar Chart */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Severity Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={severityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]}>
              {severityData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[index]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Charts;
