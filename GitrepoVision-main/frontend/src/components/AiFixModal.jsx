import React, { useState, useEffect, useRef } from 'react';
import { DiffEditor, Editor } from '@monaco-editor/react';
import { X, Check, Loader2, Sparkles, AlertTriangle, Github } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import api from '../utils/axios';

const AiFixModal = ({ isOpen, onClose, issue, repoUrl, initialAction = 'explain' }) => {
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [pushResult, setPushResult] = useState(null);
  const [fixedLocally, setFixedLocally] = useState(false);
  const [currentEditorCode, setCurrentEditorCode] = useState('');
  
  const [originalCode, setOriginalCode] = useState('');
  const [fixedCode, setFixedCode] = useState('');
  const [explanation, setExplanation] = useState('');
  const [suggestion, setSuggestion] = useState('');

  // Cache object to store previous AI responses
  const cacheRef = useRef({});
  const editorRef = useRef(null);

  // Extract repo owner/name internally from repoUrl or rely on API to do it.
  
  useEffect(() => {
    if (isOpen && issue) {
      const issueKey = `${issue.file}-${issue.line}-${issue.rule}`;
      
      // If we already have cached data for this specific issue, use it
      if (cacheRef.current[issueKey]) {
        const cachedData = cacheRef.current[issueKey];
        setOriginalCode(cachedData.originalCode);
        setFixedCode(cachedData.fixedCode);
        setExplanation(cachedData.explanation);
        setSuggestion(cachedData.suggestion);
        setLoading(false);
        setError(null);
      } else {
        // Otherwise, clear state and fetch from API
        setOriginalCode('');
        setFixedCode('');
        setExplanation('');
        setSuggestion('');
        setLoading(true);
        fetchCodeAndFix(issueKey);
      }
    } else {
      resetState();
    }
  }, [isOpen, issue]);

  const resetState = () => {
    setLoading(false);
    setApplying(false);
    setSuccess(false);
    setError(null);
    setPushResult(null);
    setFixedLocally(false);
    setCurrentEditorCode('');
  };

  const fetchCodeAndFix = async (issueKey) => {
    setError(null);
    try {
      const parts = repoUrl.replace(/\/$/, '').split('/');
      const owner = parts[parts.length - 2];
      const repo = parts[parts.length - 1];
      
      const fileRes = await api.get(`/file-content`, {
        params: { owner, repo, path: issue.file }
      });
      const code = fileRes.data.content;
      setOriginalCode(code);
      
      const ext = issue.file.split('.').pop();
      const language = ['js', 'jsx', 'ts', 'tsx'].includes(ext) ? 'javascript' : 'python';

      const fixRes = await api.post('/ai/fix', {
        code: code,
        issue: `${issue.rule} at line ${issue.line}: ${issue.function ? 'in function ' + issue.function : ''}`,
        language,
        file_path: issue.file
      });

      setFixedCode(fixRes.data.fixed_code);
      setExplanation(fixRes.data.explanation);
      setSuggestion(fixRes.data.suggestion);
      
      // Cache the successful result
      cacheRef.current[issueKey] = {
        originalCode: code,
        fixedCode: fixRes.data.fixed_code,
        explanation: fixRes.data.explanation,
        suggestion: fixRes.data.suggestion
      };
      
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch AI fix');
    } finally {
      setLoading(false);
    }
  };

  const applyFixDirectly = async () => {
    setApplying(true);
    setError(null);
    try {
      // Capture the latest edited code and switch to fixed-only editor mode.
      const codeToApply = editorRef.current && editorRef.current.getModifiedEditor
        ? editorRef.current.getModifiedEditor().getValue()
        : fixedCode;
      setFixedCode(codeToApply);
      setCurrentEditorCode(codeToApply);
      setFixedLocally(true);
      setSuccess(false);
      setPushResult(null);
    } catch (err) {
      console.error(err);
      setError('Failed to apply fix');
    } finally {
      setApplying(false);
    }
  };

  const applyFix = async () => {
    setApplying(true);
    setError(null);
    try {
      let codeToApply = fixedCode;
      if (editorRef.current) {
        if (fixedLocally && typeof editorRef.current.getValue === 'function') {
          codeToApply = editorRef.current.getValue();
        } else if (editorRef.current.getModifiedEditor) {
          codeToApply = editorRef.current.getModifiedEditor().getValue();
        }
      }
      const response = await api.post('/push-fix', {
        repo: repoUrl,
        file_path: issue.file,
        updated_code: codeToApply
      });
      setSuccess(true);
      setPushResult(response.data);
      setFixedLocally(false); // Reset the local fix flag since we successfully pushed
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403) {
        setError('403 Forbidden: You do not have permission to push to this repository, or your GitHub Personal Access Token lacks the "repo" scope (ensure it enables repo contents read/write).');
      } else {
        setError(err.response?.data?.error || 'Failed to apply fix to GitHub.');
      }
    } finally {
      setApplying(false);
    }
  };

  if (!isOpen) return null;

  const getLanguage = (filename) => {
    if (!filename) return 'javascript';
    if (filename.endsWith('.py')) return 'python';
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return 'typescript';
    return 'javascript';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between bg-gray-50 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {initialAction === 'explain' ? 'AI Explanation' : initialAction === 'suggest' ? 'AI Suggestion' : 'AI Auto Fix'}
              </h2>
              <p className="text-sm text-gray-500 font-mono mt-1">
                {issue?.file} <span className="mx-2">•</span> Line {issue?.line}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-gray-50">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              <p className="text-gray-600 font-medium animate-pulse">AI is analyzing and fixing the code...</p>
            </div>
          ) : error && !originalCode ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-100 flex flex-col items-center max-w-lg text-center">
                <AlertTriangle className="w-12 h-12 mb-4 text-red-500" />
                <h3 className="text-lg font-bold mb-2">Error Loading Fix</h3>
                <p>{error}</p>
                <button 
                  onClick={onClose}
                  className="mt-6 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x min-h-0">
              
              {/* Left Panel: Explanation & Suggestion */}
              <div className={`flex flex-col min-h-0 bg-white ${initialAction === 'fix' ? 'w-full lg:w-1/3 border-r' : 'w-full'}`}>
                <div className="p-6 overflow-y-auto flex-1">
                  
                  {/* Explanation Block */}
                  {(initialAction === 'explain' || initialAction === 'fix') && (
                    <div className="animate-in fade-in duration-300 mb-6">
                      <span className="inline-block px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold mb-3">
                        {issue?.rule}
                      </span>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">Issue Explanation</h3>
                      <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 border border-gray-100 rounded-lg p-5">
                        <ReactMarkdown>
                          {explanation || 'Analyzing...'}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                  
                  {/* Suggestion Block */}
                  {(initialAction === 'suggest' || initialAction === 'fix') && (
                    <div className="animate-in fade-in duration-300 mb-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-2 mt-2">AI Suggestion</h3>
                      <div className="prose prose-sm max-w-none text-blue-900 bg-blue-50 border border-blue-100 rounded-lg p-5 shadow-sm">
                         <ReactMarkdown>
                          {suggestion || 'Generating suggestion...'}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Code Preview Block */}
                  {initialAction === 'fix' && currentEditorCode && (
                    <div className="animate-in fade-in duration-300 mb-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-2">Your Code Changes</h3>
                      <div className="bg-gray-900 text-gray-200 rounded-lg p-4 border border-gray-700 overflow-auto max-h-[250px] text-sm font-mono">
                        <pre>{currentEditorCode}</pre>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="mt-6 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start">
                      <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-lg border border-green-200 flex flex-col items-center justify-center text-center">
                      <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                        <Check className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold mb-1">
                        {fixedLocally && !pushResult?.branch ? 'Code Fixed Successfully!' : 'Changes Pushed Successfully!'}
                      </h4>
                      <p className="text-sm text-green-600 mb-2">
                        {fixedLocally && !pushResult?.branch 
                          ? 'Your code fix is ready. Click "Push to Git" to push it to GitHub.'
                          : pushResult?.branch ? `Changes pushed to ${pushResult.branch} branch.` : 'The changes have been pushed to GitHub.'}
                      </p>
                      {pushResult?.commit_url && (
                        <a 
                          href={pushResult.commit_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                        >
                          View on GitHub
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="p-4 border-t bg-gray-50 flex items-center justify-end space-x-3 flex-shrink-0">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  {initialAction === 'fix' && (
                    <>
                      <button
                        onClick={applyFixDirectly}
                        disabled={applying || fixedLocally}
                        className={`px-5 py-2 text-sm font-medium rounded-lg flex items-center shadow-sm transition-all
                          ${fixedLocally
                            ? 'bg-blue-500 text-white cursor-default'
                            : applying
                              ? 'bg-gray-400 text-white cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                      >
                        {applying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {!applying && !fixedLocally && <Check className="w-4 h-4 mr-2" />}
                        {fixedLocally ? 'Code Fixed' : 'Fix Code'}
                      </button>
                      
                      <button
                        onClick={applyFix}
                        disabled={applying || !fixedLocally || success}
                        className={`px-5 py-2 text-sm font-medium rounded-lg flex items-center shadow-sm transition-all
                          ${success
                            ? 'bg-green-500 text-white cursor-default' 
                            : !fixedLocally
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : applying 
                                ? 'bg-gray-700 text-white cursor-not-allowed'
                                : 'bg-gray-900 hover:bg-black text-white'}`}
                      >
                        {applying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {!applying && !success && fixedLocally && <Github className="w-4 h-4 mr-2" />}
                        {success ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Pushed to Git
                          </>
                        ) : (
                          'Push to Git'
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Right Panel: Editor (Only show for Auto Fix) */}
              {initialAction === 'fix' && (
                <div className="w-full lg:w-2/3 flex flex-col min-h-0">
                  <div className="bg-gray-800 text-gray-300 text-xs px-4 py-2 flex justify-between items-center flex-shrink-0">
                    <span>{fixedLocally ? 'Fixed Code Editor' : 'Original Code (Left) vs. Fixed Code (Right)'}</span>
                    <span>{getLanguage(issue?.file)}</span>
                  </div>
                  <div className="flex-1 min-h-[400px]">
                    {fixedLocally ? (
                      <Editor
                        value={fixedCode}
                        language={getLanguage(issue?.file)}
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          wordWrap: 'on'
                        }}
                        onMount={(editor) => {
                          editorRef.current = editor;
                        }}
                        onChange={(value) => {
                          const updated = value || '';
                          setFixedCode(updated);
                          setCurrentEditorCode(updated);
                        }}
                      />
                    ) : (
                      <DiffEditor
                        original={originalCode}
                        modified={fixedCode}
                        language={getLanguage(issue?.file)}
                        theme="vs-dark"
                        options={{
                          readOnly: false, // The left is always readOnly in DiffEditor. We let the right be editable.
                          renderSideBySide: true,
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          wordWrap: 'on'
                        }}
                        onMount={(editor) => {
                          editorRef.current = editor;
                          if (editor && editor.getModifiedEditor()) {
                            setCurrentEditorCode(editor.getModifiedEditor().getValue());
                          }
                        }}
                        onChange={() => {
                          if (editorRef.current && editorRef.current.getModifiedEditor()) {
                            setCurrentEditorCode(editorRef.current.getModifiedEditor().getValue());
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiFixModal;