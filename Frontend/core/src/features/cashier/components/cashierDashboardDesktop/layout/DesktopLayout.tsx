import React, { type ReactNode } from 'react';

interface DesktopLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
  rightPanel?: ReactNode;
  isRightPanelOpen: boolean;
}

export const DesktopLayout: React.FC<DesktopLayoutProps> = ({ 
  sidebar, 
  children, 
  rightPanel, 
  isRightPanelOpen 
}) => {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-800 font-sans">
      {/* Sidebar - Fixed width */}
      <div className="w-20 md:w-64 bg-white border-r border-slate-200 flex flex-col h-full shrink-0 shadow-sm z-10 transition-all duration-300">
        {sidebar}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          {children}
        </main>
      </div>

      {/* Right Panel - Master/Detail Slide-in */}
      <div 
        className={`fixed top-0 right-0 h-full w-[450px] bg-white shadow-2xl border-l border-slate-200 transform transition-transform duration-300 ease-in-out z-20 flex flex-col ${
          isRightPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {rightPanel}
      </div>

      {/* Overlay when right panel is open on smaller desktop screens */}
      {isRightPanelOpen && (
        <div className="xl:hidden fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-10 transition-opacity" />
      )}
    </div>
  );
};
