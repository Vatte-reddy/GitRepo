import React, { useMemo, useState } from 'react';
import { BookOpen, Copy, Wrench, Code2, Languages } from 'lucide-react';

const Section = ({ icon, title, children }) => (
  <div className="bg-white/80 rounded-xl border border-sky-100 p-4">
    <div className="flex items-center gap-2 mb-3">
      <span className="text-sky-700">{icon}</span>
      <h4 className="font-semibold text-gray-800">{title}</h4>
    </div>
    {children}
  </div>
);

const TagList = ({ items, emptyText = 'Not detected' }) => {
  if (!items || items.length === 0) {
    return <p className="text-sm text-gray-500">{emptyText}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-sky-100 to-teal-100 text-sky-800 border border-sky-200"
        >
          {item}
        </span>
      ))}
    </div>
  );
};

const RepositoryInsights = ({ insights }) => {
  const [copied, setCopied] = useState(false);

  const setupBlock = useMemo(() => {
    const commands = insights?.setup_instructions || [];
    return commands.join('\n');
  }, [insights]);

  const handleCopy = async () => {
    if (!setupBlock) return;
    try {
      await navigator.clipboard.writeText(setupBlock);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  if (!insights) {
    return (
      <div className="rounded-2xl shadow-md border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-sky-50 p-6 mb-8">
        <h3 className="text-xl font-bold text-gray-800">Repository Insights</h3>
        <p className="text-sm text-gray-600 mt-2">
          Repository insights are not available in this analysis response yet.
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Restart backend and run Analyze again to include tech stack, setup instructions, and docs links.
        </p>
      </div>
    );
  }

  const techStack = insights.tech_stack || {};

  return (
    <div className="rounded-2xl shadow-md border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-teal-50 p-6 mb-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Repository Insights</h3>
          <p className="text-sm text-gray-500 mt-1">Structured summary generated from repository files</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section icon={<Wrench size={18} />} title="Tech Stack">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Frontend</p>
              <TagList items={techStack.frontend || []} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Backend</p>
              <TagList items={techStack.backend || []} />
            </div>
          </div>
        </Section>

        <Section icon={<Code2 size={18} />} title="Setup Instructions">
          {(insights.setup_instructions || []).length > 0 ? (
            <>
              <pre className="bg-gray-900 text-gray-100 rounded-lg text-sm p-3 overflow-x-auto">
{(insights.setup_instructions || []).map((cmd) => `$ ${cmd}`).join('\n')}
              </pre>
              <button
                onClick={handleCopy}
                className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 transition-colors"
              >
                <Copy size={14} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-500">No setup commands detected.</p>
          )}
        </Section>

        <Section icon={<BookOpen size={18} />} title="Documentation Links">
          {(insights.documentation_links || []).length > 0 ? (
            <ul className="space-y-2">
              {insights.documentation_links.map((doc) => (
                <li key={doc.name}>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-700 hover:text-sky-900 hover:underline text-sm font-medium"
                  >
                    {doc.name} Docs
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No documentation links mapped.</p>
          )}
        </Section>

        <Section icon={<Languages size={18} />} title="Languages Used">
          <TagList items={techStack.languages || []} emptyText="No language signals detected." />
        </Section>
      </div>
    </div>
  );
};

export default RepositoryInsights;
