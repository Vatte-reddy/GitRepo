import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRepo } from '../context/RepoContext';

// ── Extension → colour badge map ────────────────────────────────────────────
const EXT_COLORS = {
  js:   { bg: '#fef3c7', text: '#92400e', label: 'JS'   },
  jsx:  { bg: '#fef3c7', text: '#b45309', label: 'JSX'  },
  ts:   { bg: '#dbeafe', text: '#1d4ed8', label: 'TS'   },
  tsx:  { bg: '#dbeafe', text: '#1e40af', label: 'TSX'  },
  py:   { bg: '#d1fae5', text: '#065f46', label: 'PY'   },
  md:   { bg: '#ede9fe', text: '#5b21b6', label: 'MD'   },
  json: { bg: '#fee2e2', text: '#991b1b', label: 'JSON' },
  css:  { bg: '#fce7f3', text: '#9d174d', label: 'CSS'  },
  html: { bg: '#ffedd5', text: '#9a3412', label: 'HTML' },
  yml:  { bg: '#e0f2fe', text: '#075985', label: 'YML'  },
  yaml: { bg: '#e0f2fe', text: '#075985', label: 'YAML' },
  sh:   { bg: '#f3f4f6', text: '#374151', label: 'SH'   },
  txt:  { bg: '#f3f4f6', text: '#6b7280', label: 'TXT'  },
  env:  { bg: '#fef9c3', text: '#713f12', label: 'ENV'  },
};

function getExt(filename) {
  const parts = filename.split('.');
  if (parts.length < 2) return null;
  return parts[parts.length - 1].toLowerCase();
}

// ── Single tree node (recursive) ────────────────────────────────────────────
const TreeNode = ({ node, depth, selectedFile, onSelect }) => {
  const [open, setOpen] = useState(depth < 2); // auto-expand first 2 levels
  const isFolder = node.type === 'folder';
  const isSelected = !isFolder && selectedFile === node.name + (depth);
  const indent = depth * 16;
  const ext = !isFolder ? getExt(node.name) : null;
  const badge = ext ? EXT_COLORS[ext] : null;

  const handleClick = () => {
    if (isFolder) {
      setOpen(o => !o);
    } else {
      onSelect(node.name + depth);
    }
  };

  return (
    <div>
      {/* Row */}
      <div
        onClick={handleClick}
        style={{ paddingLeft: `${indent + 8}px` }}
        className={`
          flex items-center gap-2 py-[5px] pr-3 rounded-lg cursor-pointer
          transition-all duration-150 select-none group
          ${isSelected
            ? 'bg-blue-100 text-blue-800'
            : 'hover:bg-gray-100 text-gray-700'}
        `}
      >
        {/* Chevron for folders */}
        {isFolder ? (
          <span
            className="text-gray-400 transition-transform duration-200 flex-shrink-0"
            style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block', fontSize: '10px' }}
          >
            ▶
          </span>
        ) : (
          <span className="w-[10px] flex-shrink-0" />
        )}

        {/* Icon */}
        <span className="text-base leading-none flex-shrink-0">
          {isFolder ? '📁' : '📄'}
        </span>

        {/* Name */}
        <span className={`text-sm font-medium truncate flex-1 ${isFolder ? 'text-gray-800' : 'text-gray-600'}`}>
          {node.name}
        </span>

        {/* Extension badge */}
        {badge && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ background: badge.bg, color: badge.text }}
          >
            {badge.label}
          </span>
        )}
      </div>

      {/* Children */}
      {isFolder && open && node.children && (
        <div>
          {node.children.map((child, idx) => (
            <TreeNode
              key={child.name + idx}
              node={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Stat pill ───────────────────────────────────────────────────────────────
const Pill = ({ label, value, color }) => (
  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
    <span>{label}</span>
    <span className="font-bold">{value}</span>
  </div>
);

// ── Count helper ─────────────────────────────────────────────────────────────
function countNodes(node, isRoot = true) {
  if (!node) return { folders: 0, files: 0 };
  let folders = 0, files = 0;
  if (node.type === 'folder') {
    folders++;
    (node.children || []).forEach(c => {
      const r = countNodes(c, false);
      folders += r.folders;
      files += r.files;
    });
  } else {
    files++;
  }
  return { folders: isRoot ? Math.max(folders - 1, 0) : folders, files };
}

// ── Main component ───────────────────────────────────────────────────────────
const RepoTreeViewer = ({ repoUrl }) => {
  const { getTreeForUrl, setTreeForUrl } = useRepo();
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const fetchTree = useCallback(async () => {
    if (!repoUrl) return;

    const cachedTree = getTreeForUrl(repoUrl);
    if (cachedTree) {
      setTree(cachedTree);
      setError('');
      setLoading(false);
      return;
    }

    // Parse owner / repo from URL
    let owner, repo;
    try {
      const parts = repoUrl.replace(/\.git$/, '').split('/');
      repo = parts[parts.length - 1];
      owner = parts[parts.length - 2];
    } catch {
      setError('Invalid repository URL');
      return;
    }

    setLoading(true);
    setError('');
    setTree(null);
    setSelectedFile(null);

    try {
      const res = await axios.get(`http://localhost:5000/repo-tree`, {
        params: { owner, repo },
      });
      setTree(res.data);
      setTreeForUrl(repoUrl, res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load repository structure.');
    } finally {
      setLoading(false);
    }
  }, [repoUrl, getTreeForUrl, setTreeForUrl]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const stats = tree ? countNodes(tree) : null;

  return (
    <div className="bg-white rounded-xl shadow-md mb-8 overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-lg">🌳</div>
          <div>
            <h2 className="text-base font-bold text-gray-800">Repository Structure</h2>
            <p className="text-xs text-gray-500">Interactive file tree explorer</p>
          </div>
        </div>
        {stats && (
          <div className="flex items-center gap-2">
            <Pill label="📁 Folders" value={stats.folders} color="bg-amber-50 text-amber-700" />
            <Pill label="📄 Files" value={stats.files} color="bg-blue-50 text-blue-700" />
          </div>
        )}
      </div>

      {/* Body */}
      <div
        className="p-4 overflow-y-auto font-mono"
        style={{ maxHeight: '520px', background: '#fafafa', minHeight: '120px' }}
      >
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="spinner" style={{ width: 32, height: 32 }} />
            <p className="text-sm text-gray-500">Loading repository structure…</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {tree && !loading && (
          <div>
            {/* Root label */}
            <div className="flex items-center gap-2 pb-2 mb-1 border-b border-gray-200">
              <span className="text-lg">🏠</span>
              <span className="text-sm font-bold text-gray-700">
                {repoUrl ? repoUrl.split('/').slice(-2).join(' / ') : 'Repository'}
              </span>
            </div>
            {(tree.children || []).map((child, idx) => (
              <TreeNode
                key={child.name + idx}
                node={child}
                depth={0}
                selectedFile={selectedFile}
                onSelect={setSelectedFile}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      {tree && (
        <div className="px-6 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
          Click folders to expand · Click files to highlight
        </div>
      )}
    </div>
  );
};

export default RepoTreeViewer;
