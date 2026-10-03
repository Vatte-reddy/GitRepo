import React, { createContext, useContext, useMemo, useState } from 'react';

const RepoContext = createContext(null);

const SHARED_URL_KEY = 'gitrepovision_shared_url';
const ANALYSIS_DATA_KEY = 'gitrepovision_analysis_data';
const ANALYSIS_REPO_URL_KEY = 'gitrepovision_analysis_repo_url';
const TREE_CACHE_KEY = 'gitrepovision_tree_cache';

const readStorage = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeStorage = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures (private mode/quota), keep in-memory behavior.
  }
};

export const RepoProvider = ({ children }) => {
  const [sharedUrl, setSharedUrlState] = useState(() => readStorage(SHARED_URL_KEY, ''));
  const [analysisData, setAnalysisDataState] = useState(() => readStorage(ANALYSIS_DATA_KEY, null));
  const [analysisRepoUrl, setAnalysisRepoUrlState] = useState(() => readStorage(ANALYSIS_REPO_URL_KEY, ''));
  const [treeCache, setTreeCacheState] = useState(() => readStorage(TREE_CACHE_KEY, {}));

  const setSharedUrl = (url) => {
    setSharedUrlState(url);
    writeStorage(SHARED_URL_KEY, url);
  };

  const setAnalysisData = (data, repoUrl = '') => {
    setAnalysisDataState(data);
    writeStorage(ANALYSIS_DATA_KEY, data);
    setAnalysisRepoUrlState(repoUrl);
    writeStorage(ANALYSIS_REPO_URL_KEY, repoUrl);
  };

  const clearAnalysisData = () => {
    setAnalysisDataState(null);
    writeStorage(ANALYSIS_DATA_KEY, null);
    setAnalysisRepoUrlState('');
    writeStorage(ANALYSIS_REPO_URL_KEY, '');
  };

  const setTreeForUrl = (url, tree) => {
    if (!url) return;
    setTreeCacheState((prev) => {
      const next = { ...prev, [url]: tree };
      writeStorage(TREE_CACHE_KEY, next);
      return next;
    });
  };

  const getTreeForUrl = (url) => {
    if (!url) return null;
    return treeCache[url] || null;
  };

  const value = useMemo(() => ({
    sharedUrl,
    setSharedUrl,
    analysisData,
    analysisRepoUrl,
    setAnalysisData,
    clearAnalysisData,
    treeCache,
    setTreeForUrl,
    getTreeForUrl,
  }), [sharedUrl, analysisData, analysisRepoUrl, treeCache]);

  return (
    <RepoContext.Provider value={value}>
      {children}
    </RepoContext.Provider>
  );
};

export const useRepo = () => useContext(RepoContext);
