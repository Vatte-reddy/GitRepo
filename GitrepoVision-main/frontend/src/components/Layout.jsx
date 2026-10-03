import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/',      icon: '🏠', label: 'Home'          },
  { to: '/preview', icon: '🖥️', label: 'Frontend Preview' },
  { to: '/issues', icon: '📋', label: 'All Issues'    },
  { to: '/tree',  icon: '🌳', label: 'Tree Explorer' },
];

const Layout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50">

      {/* ── Left Sidebar ── */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 shadow-sm flex flex-col">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold shadow">
              G
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 leading-tight">GitRepoVision</p>
              <p className="text-[10px] text-gray-400 leading-tight">Risk Analyzer</p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">Menu</p>
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="text-base leading-none">{icon}</span>
                  <span>{label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 text-center">v1.0 · GitRepoVision</p>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;
