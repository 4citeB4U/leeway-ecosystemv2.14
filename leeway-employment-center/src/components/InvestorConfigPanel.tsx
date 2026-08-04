/*
FILE: src\components\InvestorConfigPanel.tsx
PURPOSE: Display investor portal configuration and status
GOVERNED_BY: LeeWay Standards
TAG: UI.COMPONENT.INVESTOR_CONFIG_PANEL
REGION: 🔵 UI
STATUS: ACTIVE
*/

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Settings,
  Zap,
  Mic,
  Mail,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { InvestorPortalConfig } from '../types';

export default function InvestorConfigPanel() {
  const [config, setConfig] = useState<InvestorPortalConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      setLoading(true);
      // Try to load from the config file
      const response = await fetch('/leeway.investor.config.json');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      } else {
        // Use default config
        setConfig({
          baseUrl: 'http://localhost:3000',
          defaultDeviceLimit: 1,
          defaultSessionLimit: 5,
          defaultExpirationHours: 168,
          allowQrCode: true,
          sendMode: 'copy-link',
          emailEnabled: false,
          governedBy: 'LeeWay Standards'
        });
      }
    } catch (error) {
      console.error('Failed to load investor config:', error);
      // Use default
      setConfig({
        baseUrl: 'http://localhost:3000',
        defaultDeviceLimit: 1,
        defaultSessionLimit: 5,
        defaultExpirationHours: 168,
        allowQrCode: true,
        sendMode: 'copy-link',
        emailEnabled: false,
        governedBy: 'LeeWay Standards'
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading || !config) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 bg-white border border-black/10 rounded-lg space-y-4"
    >
      <h4 className="text-lg font-semibold text-[#1A1A1A] flex items-center gap-2">
        <Settings size={18} />
        Investor Portal Configuration
      </h4>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-[#1A1A1A]/60 text-xs uppercase font-semibold">Base URL</p>
          <p className="text-[#1A1A1A] font-mono text-xs mt-1">{config.baseUrl}</p>
        </div>

        <div>
          <p className="text-[#1A1A1A]/60 text-xs uppercase font-semibold">Send Mode</p>
          <p className="text-[#1A1A1A] capitalize text-xs mt-1">{config.sendMode}</p>
        </div>

        <div>
          <p className="text-[#1A1A1A]/60 text-xs uppercase font-semibold">Default Device Limit</p>
          <p className="text-[#1A1A1A] text-xs mt-1">{config.defaultDeviceLimit}</p>
        </div>

        <div>
          <p className="text-[#1A1A1A]/60 text-xs uppercase font-semibold">Expiration (hours)</p>
          <p className="text-[#1A1A1A] text-xs mt-1">{config.defaultExpirationHours}</p>
        </div>
      </div>

      <div className="space-y-2 pt-4 border-t border-black/5">
        <h5 className="text-sm font-semibold text-[#1A1A1A]">Capabilities</h5>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start gap-2 p-2 bg-black/2 rounded">
            {config.allowQrCode ? (
              <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="text-zinc-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-xs font-semibold text-[#1A1A1A]">QR Code</p>
              <p className="text-xs text-[#1A1A1A]/60">{config.allowQrCode ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 p-2 bg-black/2 rounded">
            {config.emailEnabled ? (
              <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="text-zinc-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-xs font-semibold text-[#1A1A1A]">Email</p>
              <p className="text-xs text-[#1A1A1A]/60">{config.emailEnabled ? 'Enabled' : 'Copy link mode'}</p>
            </div>
          </div>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 flex gap-2">
          <Mic size={14} className="flex-shrink-0 mt-0.5" />
          <span>Voice support: Not available in this environment. Text-only mode active.</span>
        </div>
      </div>

      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700 flex gap-2">
        <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
        <span>Governed by {config.governedBy}. All investor actions are audited and restricted.</span>
      </div>
    </motion.div>
  );
}
