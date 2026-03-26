import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Sidebar } from './Sidebar';
import { useUIStore } from '@/stores/uiStore';

interface ShellProps {
  children: React.ReactNode;
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}

export function Shell({ children }: ShellProps) {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const { user, logout } = useAuth0();

  return (
    <div className="flex h-screen overflow-hidden bg-[#F9FAFB]">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-[#E4E7EC] flex items-center justify-between px-4 flex-shrink-0">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            className="p-2 rounded-md text-[#667085] hover:text-[#344054] hover:bg-[#F2F4F7] transition-colors"
          >
            <MenuIcon />
          </button>

          <div className="flex items-center gap-3">
            {user && (
              <>
                <span className="text-sm text-[#344054] hidden sm:block">
                  {user.name ?? user.email}
                </span>
                <button
                  type="button"
                  onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                  className="text-sm text-[#667085] hover:text-[#344054] transition-colors px-3 py-1.5 rounded-md hover:bg-[#F2F4F7]"
                >
                  Sign out
                </button>
                <div className="w-8 h-8 rounded-full bg-[#2B5BA8] flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {(user.name ?? user.email ?? 'U')[0].toUpperCase()}
                  </span>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Main content */}
        <main
          className="flex-1 overflow-y-auto p-6"
          id="main-content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
