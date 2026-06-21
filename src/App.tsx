/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Home, PlusCircle, Settings, Menu, X, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Dashboard from './components/Dashboard';
import AddRecord from './components/AddRecord';
import SettingsPage from './components/SettingsPage';

export type Page = 'dashboard' | 'add' | 'settings';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [rate, setRate] = useState<number>(95.5);

  const navItems = [
    { id: 'dashboard' as Page, label: 'Dashboard', icon: Home },
    { id: 'add' as Page, label: 'Add Record', icon: PlusCircle },
    { id: 'settings' as Page, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2 text-blue-600">
          <Coins className="w-6 h-6" />
          <span className="font-semibold text-lg text-slate-800">THB to MMK</span>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 min-h-screen sticky top-0">
        <div className="p-6 flex items-center gap-2 text-blue-600">
          <Coins className="w-8 h-8" />
          <span className="font-bold text-xl text-slate-800">THB to MMK</span>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium text-left ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                {item.label}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 w-full max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {currentPage === 'dashboard' && <Dashboard key="dashboard" />}
          {currentPage === 'add' && <AddRecord key="add" rate={rate} />}
          {currentPage === 'settings' && <SettingsPage key="settings" rate={rate} setRate={setRate} />}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 flex justify-between items-center z-20 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`flex-1 flex flex-col items-center justify-center p-2 rounded-lg ${
                isActive ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              <div className={`p-1.5 rounded-full ${isActive ? 'bg-blue-50' : 'bg-transparent'}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-blue-700' : 'text-slate-500'}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  );
}

