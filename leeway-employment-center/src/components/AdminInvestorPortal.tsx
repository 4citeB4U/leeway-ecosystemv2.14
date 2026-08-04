/*
FILE: src\components\AdminInvestorPortal.tsx
PURPOSE: Admin interface for managing investor deployments
GOVERNED_BY: LeeWay Standards
TAG: UI.COMPONENT.ADMIN_INVESTOR_PORTAL
REGION: 🔵 UI
STATUS: ACTIVE
*/

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Search,
  Mail,
  Copy,
  Check,
  QrCode,
  Shield,
  AlertCircle,
  Trash2,
  Pause,
  RotateCw,
  Eye,
  FileText,
  Clock,
  Building2,
  User,
  Users,
  MoreVertical,
  ChevronDown,
  Settings,
  Briefcase,
  Bot
} from 'lucide-react';
import type {
  InvestorRecord,
  InvestorAgentAssignment,
  InvestorInviteToken,
  InvestorDeploymentAuditReceipt
} from '../types';
import {
  createInvestor,
  getAllInvestors,
  updateInvestor,
  createAssignment,
  getAssignmentsByInvestor,
  updateAssignment,
  createInviteToken,
  getTokensByInvestor,
  updateInviteToken,
  getAuditsByInvestor
} from '../lib/investorStore';
import {
  generateInviteToken,
  generateActivationLink,
  createInvestorAuditReceipt,
  getDefaultInvestorPermissions
} from '../lib/investorGovernance';
import { cn, generateId } from '../lib/utils';
import InvestorConfigPanel from './InvestorConfigPanel';

type AdminInvestorPanel = 'list' | 'detail' | 'deploy' | 'audit';

const ADMIN_ID = 'ADMIN-LEE-001';

interface AdminInvestorPortalProps {
  onOpenInvestorPortal?: (token: string) => void;
}

export default function AdminInvestorPortal({ onOpenInvestorPortal }: AdminInvestorPortalProps) {
  const [activePanel, setActivePanel] = useState<AdminInvestorPanel>('list');
  const [investors, setInvestors] = useState<InvestorRecord[]>([]);
  const [selectedInvestor, setSelectedInvestor] = useState<InvestorRecord | null>(null);
  const [assignments, setAssignments] = useState<InvestorAgentAssignment[]>([]);
  const [tokens, setTokens] = useState<InvestorInviteToken[]>([]);
  const [audits, setAudits] = useState<InvestorDeploymentAuditReceipt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNewInvestorForm, setShowNewInvestorForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    role: '',
    interestLevel: 'medium' as const
  });

  // Load all investors on mount
  useEffect(() => {
    loadInvestors();
  }, []);

  // Load investor details when selected
  useEffect(() => {
    if (selectedInvestor) {
      loadInvestorDetails(selectedInvestor.investorId);
    }
  }, [selectedInvestor]);

  async function loadInvestors() {
    try {
      setLoading(true);
      const data = await getAllInvestors();
      setInvestors(data);
    } catch (error) {
      console.error('Failed to load investors:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadInvestorDetails(investorId: string) {
    try {
      const [assignmentsData, tokensData, auditsData] = await Promise.all([
        getAssignmentsByInvestor(investorId),
        getTokensByInvestor(investorId),
        getAuditsByInvestor(investorId)
      ]);

      setAssignments(assignmentsData);
      setTokens(tokensData);
      setAudits(auditsData);
    } catch (error) {
      console.error('Failed to load investor details:', error);
    }
  }

  async function handleCreateInvestor() {
    if (!formData.name || !formData.email || !formData.company) return;

    try {
      const newInvestor: InvestorRecord = {
        investorId: `INV-${generateId()}`,
        name: formData.name,
        email: formData.email,
        company: formData.company,
        role: formData.role,
        interestLevel: formData.interestLevel,
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: ADMIN_ID,
        notes: ''
      };

      await createInvestor(newInvestor);
      await createInvestorAuditReceipt(
        newInvestor.investorId,
        '',
        'CREATE_INVESTOR',
        ADMIN_ID,
        `Created investor: ${formData.name}`
      );

      setFormData({ name: '', email: '', company: '', role: '', interestLevel: 'medium' });
      setShowNewInvestorForm(false);
      await loadInvestors();
    } catch (error) {
      console.error('Failed to create investor:', error);
    }
  }

  async function handleDeployAgent(investorId: string) {
    if (!selectedInvestor) return;

    try {
      const assignmentId = `ASN-${generateId()}`;
      const assignment: InvestorAgentAssignment = {
        assignmentId,
        investorId,
        agentName: 'Investor Relations Agent',
        agentType: 'Investor Relations Agent',
        status: 'deployed',
        deployedAt: new Date().toISOString(),
        deployedBy: ADMIN_ID,
        permissions: getDefaultInvestorPermissions(),
        deviceLimit: 1,
        sessionLimit: 5,
        expirationHours: 168
      };

      await createAssignment(assignment);

      // Create invite token
      const tokenString = generateInviteToken();
      const baseUrl = 'http://localhost:3000';
      const token: InvestorInviteToken = {
        tokenId: `TKN-${generateId()}`,
        investorId,
        assignmentId,
        token: tokenString,
        status: 'active',
        activationLink: generateActivationLink(baseUrl, tokenString),
        createdAt: new Date().toISOString(),
        createdBy: ADMIN_ID,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      await createInviteToken(token);

      await createInvestorAuditReceipt(
        investorId,
        assignmentId,
        'DEPLOY_AGENT',
        ADMIN_ID,
        'Deployed Investor Relations Agent',
        { tokenId: token.tokenId }
      );

      await loadInvestorDetails(investorId);
      setActivePanel('detail');
    } catch (error) {
      console.error('Failed to deploy agent:', error);
    }
  }

  async function handleRotateToken(token: InvestorInviteToken) {
    if (!selectedInvestor) return;

    try {
      const newTokenString = generateInviteToken();
      const baseUrl = 'http://localhost:3000';
      const newToken: InvestorInviteToken = {
        ...token,
        tokenId: `TKN-${generateId()}`,
        token: newTokenString,
        status: 'active',
        activationLink: generateActivationLink(baseUrl, newTokenString),
        createdAt: new Date().toISOString(),
        rotatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      // Mark old token as rotated
      const oldToken = { ...token, status: 'rotated' as const };
      await updateInviteToken(oldToken);

      // Create new token
      await createInviteToken(newToken);

      await createInvestorAuditReceipt(
        selectedInvestor.investorId,
        token.assignmentId,
        'ROTATE_TOKEN',
        ADMIN_ID,
        'Rotated investor access token'
      );

      await loadInvestorDetails(selectedInvestor.investorId);
    } catch (error) {
      console.error('Failed to rotate token:', error);
    }
  }

  async function handleRevokeAccess(investorId: string, assignmentId: string) {
    try {
      const assignment = assignments.find(a => a.assignmentId === assignmentId);
      if (!assignment) return;

      const updated = { ...assignment, status: 'revoked' as const };
      await updateAssignment(updated);

      // Revoke all tokens for this assignment
      const assignmentTokens = tokens.filter(t => t.assignmentId === assignmentId);
      for (const token of assignmentTokens) {
        if (token.status !== 'revoked') {
          await updateInviteToken({ ...token, status: 'revoked' });
        }
      }

      await createInvestorAuditReceipt(
        investorId,
        assignmentId,
        'REVOKE_ACCESS',
        ADMIN_ID,
        'Revoked investor agent access'
      );

      if (selectedInvestor) {
        await loadInvestorDetails(selectedInvestor.investorId);
      }
    } catch (error) {
      console.error('Failed to revoke access:', error);
    }
  }

  async function handleSuspendAccess(investorId: string, assignmentId: string) {
    try {
      const assignment = assignments.find(a => a.assignmentId === assignmentId);
      if (!assignment) return;

      const updated = { ...assignment, status: 'suspended' as const };
      await updateAssignment(updated);

      await createInvestorAuditReceipt(
        investorId,
        assignmentId,
        'SUSPEND_ACCESS',
        ADMIN_ID,
        'Suspended investor agent access'
      );

      if (selectedInvestor) {
        await loadInvestorDetails(selectedInvestor.investorId);
      }
    } catch (error) {
      console.error('Failed to suspend access:', error);
    }
  }

  async function handleRestoreAccess(investorId: string, assignmentId: string) {
    try {
      const assignment = assignments.find(a => a.assignmentId === assignmentId);
      if (!assignment) return;

      const updated = { ...assignment, status: 'deployed' as const };
      await updateAssignment(updated);

      await createInvestorAuditReceipt(
        investorId,
        assignmentId,
        'RESTORE_ACCESS',
        ADMIN_ID,
        'Restored investor agent access'
      );

      if (selectedInvestor) {
        await loadInvestorDetails(selectedInvestor.investorId);
      }
    } catch (error) {
      console.error('Failed to restore access:', error);
    }
  }

  function copyToClipboard(text: string, tokenId: string) {
    navigator.clipboard.writeText(text);
    setCopiedToken(tokenId);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  const filteredInvestors = investors.filter(inv =>
    inv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'pending':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'suspended':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'revoked':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-[#1A1A1A] flex items-center gap-2">
              <Briefcase size={24} />
              Investor Management
            </h3>
            <p className="text-sm text-[#1A1A1A]/60 mt-1">
              Deploy and manage investor-facing Agent Lee agents
            </p>
          </div>
          <button
            onClick={() => setShowNewInvestorForm(true)}
            className="px-6 py-3 bg-[#1A1A1A] text-white text-xs uppercase font-bold tracking-widest hover:opacity-90 transition-all flex items-center gap-2 rounded-md"
          >
            <Plus size={14} />
            New Investor
          </button>
        </div>

        {/* New Investor Form Modal */}
        <AnimatePresence>
          {showNewInvestorForm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-6 bg-white border border-black/10 rounded-lg space-y-4"
            >
              <h4 className="text-lg font-semibold text-[#1A1A1A]">Create New Investor</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Investor Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="px-3 py-2 border border-black/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="px-3 py-2 border border-black/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
                />
                <input
                  type="text"
                  placeholder="Company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="px-3 py-2 border border-black/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
                />
                <input
                  type="text"
                  placeholder="Role/Title"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="px-3 py-2 border border-black/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
                />
              </div>

              <select
                value={formData.interestLevel}
                onChange={(e) => setFormData({ ...formData, interestLevel: e.target.value as any })}
                className="w-full px-3 py-2 border border-black/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
              >
                <option value="high">High Interest</option>
                <option value="medium">Medium Interest</option>
                <option value="low">Low Interest</option>
              </select>

              <div className="flex gap-2">
                <button
                  onClick={handleCreateInvestor}
                  disabled={!formData.name || !formData.email || !formData.company}
                  className="flex-1 px-4 py-2 bg-[#1A1A1A] text-white text-xs uppercase font-bold rounded hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  Create Investor
                </button>
                <button
                  onClick={() => setShowNewInvestorForm(false)}
                  className="flex-1 px-4 py-2 border border-black/10 text-[#1A1A1A] text-xs uppercase font-bold rounded hover:bg-black/5 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-black/10 pb-4">
        <button
          onClick={() => setActivePanel('list')}
          className={cn(
            'px-4 py-2 text-sm font-semibold transition-all',
            activePanel === 'list'
              ? 'text-[#1A1A1A] border-b-2 border-[#1A1A1A]'
              : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]'
          )}
        >
          <Users size={14} className="inline mr-2" />
          Investors
        </button>
        {selectedInvestor && (
          <>
            <button
              onClick={() => setActivePanel('detail')}
              className={cn(
                'px-4 py-2 text-sm font-semibold transition-all',
                activePanel === 'detail'
                  ? 'text-[#1A1A1A] border-b-2 border-[#1A1A1A]'
                  : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]'
              )}
            >
              <User size={14} className="inline mr-2" />
              Details
            </button>
            <button
              onClick={() => setActivePanel('audit')}
              className={cn(
                'px-4 py-2 text-sm font-semibold transition-all',
                activePanel === 'audit'
                  ? 'text-[#1A1A1A] border-b-2 border-[#1A1A1A]'
                  : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]'
              )}
            >
              <FileText size={14} className="inline mr-2" />
              Audit
            </button>
          </>
        )}
      </div>

      {/* List View */}
      {activePanel === 'list' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="relative">
            <Search className="absolute left-3 top-3 text-[#1A1A1A]/30 pointer-events-none" size={16} />
            <input
              type="text"
              placeholder="Search investors by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-black/10 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
            />
          </div>

          <div className="space-y-2">
            {filteredInvestors.length === 0 ? (
              <div className="p-8 border border-black/5 rounded-md text-center">
                <Building2 size={32} className="mx-auto text-[#1A1A1A]/20 mb-2" />
                <p className="text-sm text-[#1A1A1A]/50">No investors found. Create one to get started.</p>
              </div>
            ) : (
              filteredInvestors.map((investor) => (
                <motion.div
                  key={investor.investorId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => {
                    setSelectedInvestor(investor);
                    setActivePanel('detail');
                  }}
                  className="p-4 bg-white border border-black/5 rounded-lg hover:border-black/20 hover:bg-black/2 cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#1A1A1A]">{investor.name}</h4>
                      <p className="text-xs text-[#1A1A1A]/60 mt-1">{investor.email}</p>
                      <p className="text-xs text-[#1A1A1A]/50 mt-0.5">{investor.company} • {investor.role}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('px-2 py-1 text-xs font-semibold rounded border', statusColor(investor.status))}>
                        {investor.status}
                      </span>
                      <ChevronDown size={16} className="text-[#1A1A1A]/30" />
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* Detail View */}
      {activePanel === 'detail' && selectedInvestor && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Investor Info */}
          <div className="p-6 bg-white border border-black/10 rounded-lg space-y-4">
            <h4 className="text-lg font-semibold text-[#1A1A1A] flex items-center gap-2">
              <User size={18} />
              {selectedInvestor.name}
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[#1A1A1A]/60 text-xs uppercase font-semibold">Email</p>
                <p className="text-[#1A1A1A] font-mono">{selectedInvestor.email}</p>
              </div>
              <div>
                <p className="text-[#1A1A1A]/60 text-xs uppercase font-semibold">Company</p>
                <p className="text-[#1A1A1A]">{selectedInvestor.company}</p>
              </div>
              <div>
                <p className="text-[#1A1A1A]/60 text-xs uppercase font-semibold">Role</p>
                <p className="text-[#1A1A1A]">{selectedInvestor.role}</p>
              </div>
              <div>
                <p className="text-[#1A1A1A]/60 text-xs uppercase font-semibold">Interest Level</p>
                <p className="text-[#1A1A1A] capitalize">{selectedInvestor.interestLevel}</p>
              </div>
            </div>
          </div>

          {/* Agent Assignments */}
          <div className="p-6 bg-white border border-black/10 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-[#1A1A1A] flex items-center gap-2">
                <Bot size={18} />
                Agent Assignments
              </h4>
              {assignments.length === 0 && (
                <button
                  onClick={() => handleDeployAgent(selectedInvestor.investorId)}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs uppercase font-bold rounded hover:bg-emerald-700 transition-all flex items-center gap-2"
                >
                  <Plus size={12} />
                  Deploy Agent
                </button>
              )}
            </div>

            {assignments.length === 0 ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700 flex gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                No agent deployed yet. Deploy the Investor Relations Agent to begin.
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <div key={assignment.assignmentId} className="p-4 bg-black/2 border border-black/5 rounded-md">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-[#1A1A1A]">{assignment.agentName}</p>
                        <p className="text-xs text-[#1A1A1A]/60 mt-1">
                          Deployed {new Date(assignment.deployedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={cn('px-2 py-1 text-xs font-semibold rounded border', statusColor(assignment.status))}>
                        {assignment.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div className="text-[#1A1A1A]/60">
                        <p className="uppercase font-semibold text-[10px]">Device Limit</p>
                        <p className="text-[#1A1A1A]">{assignment.deviceLimit}</p>
                      </div>
                      <div className="text-[#1A1A1A]/60">
                        <p className="uppercase font-semibold text-[10px]">Expiration</p>
                        <p className="text-[#1A1A1A]">{assignment.expirationHours} hours</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {assignment.status === 'deployed' && (
                        <>
                          <button
                            onClick={() => handleSuspendAccess(selectedInvestor.investorId, assignment.assignmentId)}
                            className="flex-1 px-2 py-1.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded hover:bg-orange-200 transition-all flex items-center justify-center gap-1"
                          >
                            <Pause size={12} />
                            Suspend
                          </button>
                          <button
                            onClick={() => handleRevokeAccess(selectedInvestor.investorId, assignment.assignmentId)}
                            className="flex-1 px-2 py-1.5 bg-rose-100 text-rose-700 text-xs font-semibold rounded hover:bg-rose-200 transition-all flex items-center justify-center gap-1"
                          >
                            <Trash2 size={12} />
                            Revoke
                          </button>
                        </>
                      )}
                      {(assignment.status === 'suspended' || assignment.status === 'revoked') && (
                        <button
                          onClick={() => handleRestoreAccess(selectedInvestor.investorId, assignment.assignmentId)}
                          className="flex-1 px-2 py-1.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded hover:bg-amber-200 transition-all flex items-center justify-center gap-1"
                        >
                          <RotateCw size={12} />
                          Restore
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invite Tokens */}
          {tokens.length > 0 && (
            <div className="p-6 bg-white border border-black/10 rounded-lg space-y-4">
              <h4 className="text-lg font-semibold text-[#1A1A1A] flex items-center gap-2">
                <QrCode size={18} />
                Activation Links
              </h4>

              <div className="space-y-3">
                {tokens.map((token) => (
                  <div key={token.tokenId} className="p-4 bg-black/2 border border-black/5 rounded-md">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-xs text-[#1A1A1A]/60 uppercase font-semibold mb-1">Activation Link</p>
                        <p className="font-mono text-xs text-[#1A1A1A] break-all">{token.activationLink}</p>
                      </div>
                      <span className={cn('px-2 py-1 text-xs font-semibold rounded border whitespace-nowrap ml-2', statusColor(token.status))}>
                        {token.status}
                      </span>
                    </div>

                    {token.status === 'active' && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => copyToClipboard(token.activationLink, token.tokenId)}
                          className="flex-1 px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded hover:bg-blue-200 transition-all flex items-center justify-center gap-1"
                        >
                          {copiedToken === token.tokenId ? (
                            <>
                              <Check size={12} />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              Copy Link
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleRotateToken(token)}
                          className="flex-1 px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded hover:bg-amber-200 transition-all flex items-center justify-center gap-1"
                        >
                          <RotateCw size={12} />
                          Rotate
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Audit View */}
      {activePanel === 'audit' && selectedInvestor && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {audits.length === 0 ? (
            <div className="p-8 border border-black/5 rounded-md text-center">
              <FileText size={32} className="mx-auto text-[#1A1A1A]/20 mb-2" />
              <p className="text-sm text-[#1A1A1A]/50">No audit records yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {audits.map((audit) => (
                <div key={audit.receiptId} className="p-4 bg-white border border-black/5 rounded-md">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-[#1A1A1A] text-sm">{audit.action}</p>
                      <p className="text-xs text-[#1A1A1A]/60 mt-1">{audit.reason}</p>
                      <p className="text-xs text-[#1A1A1A]/40 mt-1">
                        {new Date(audit.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <span className={cn('px-2 py-1 text-xs font-semibold rounded border whitespace-nowrap ml-2',
                      audit.governanceStatus === 'passed'
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        : 'bg-rose-100 text-rose-700 border-rose-200'
                    )}>
                      {audit.governanceStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Config Panel */}
      <InvestorConfigPanel />
    </div>
  );
}
