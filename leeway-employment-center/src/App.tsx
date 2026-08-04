/*
FILE: src\App.tsx
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: UTIL.FILE.A_PP.MAIN
REGION: 🟠 UTIL
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: Inferred by verification scanner
EXPORTS: Inferred by verification scanner
STATUS: ACTIVE
*/
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import EmploymentCenter from './components/EmploymentCenter';
import AdminConsole from './components/AdminConsole';
import InvestorPortal from './components/InvestorPortal';
import { initInvestorDb } from './lib/investorStore';

export default function App() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [investorToken, setInvestorToken] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState(false);

  useEffect(() => {
    // Initialize investor database
    initInvestorDb().then(() => {
      setDbInitialized(true);
    }).catch((err) => {
      console.error('Failed to initialize investor DB:', err);
      setDbInitialized(true); // Continue anyway
    });

    // Setup path tracking
    const handlePopState = () => {
      const path = window.location.pathname;
      setCurrentPath(path);
      setAdminMode(path.startsWith('/admin'));
    };

    window.addEventListener('popstate', handlePopState);
    
    // Check initial path for admin mode
    const initialPath = window.location.pathname;
    setAdminMode(initialPath.startsWith('/admin'));
    
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Parse investor activation token from URL
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/investor/activate/')) {
      const token = path.replace('/investor/activate/', '');
      setInvestorToken(token);
      setCurrentPath(path);
    } else if (path.startsWith('/investor')) {
      setCurrentPath(path);
      setInvestorToken(null);
    } else {
      setCurrentPath(path);
      setInvestorToken(null);
    }
  }, []);

  if (!dbInitialized) {
    return (
      <div className="antialiased w-screen h-screen flex items-center justify-center">
        <p className="text-sm text-[#1A1A1A]/60">Initializing...</p>
      </div>
    );
  }

  // Admin Console route - MUST CHECK BEFORE OTHER ROUTES
  if (currentPath.startsWith('/admin')) {
    return (
      <div className="antialiased">
        <AdminConsole />
      </div>
    );
  }

  // Investor activation flow
  if (currentPath.startsWith('/investor/activate/') && investorToken) {
    return (
      <div className="antialiased">
        <InvestorPortal 
          token={investorToken}
          onBack={() => {
            window.history.pushState({}, '', '/');
            setCurrentPath('/');
            setInvestorToken(null);
          }}
        />
      </div>
    );
  }

  // Investor portal home (no token)
  if (currentPath.startsWith('/investor')) {
    return (
      <div className="antialiased">
        <InvestorPortal 
          onBack={() => {
            window.history.pushState({}, '', '/');
            setCurrentPath('/');
          }}
        />
      </div>
    );
  }

  // Default: Original Employment Center with construct/motherboard/admin integration
  return (
    <div className="antialiased">
      <EmploymentCenter />
    </div>
  );
}

