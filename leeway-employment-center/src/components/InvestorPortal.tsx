/*
FILE: src\components\InvestorPortal.tsx
PURPOSE: Investor-facing portal for Agent Lee interaction
GOVERNED_BY: LeeWay Standards
TAG: UI.COMPONENT.INVESTOR_PORTAL
REGION: 🔵 UI
STATUS: ACTIVE
*/

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  Mic,
  MicOff,
  MessageCircle,
  Plus,
  Calendar,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader,
  Home,
  ArrowLeft
} from 'lucide-react';
import type { InvestorRecord, InvestorAgentAssignment } from '../types';
import { cn } from '../lib/utils';
import { getTokenByString, getAssignmentsByInvestor } from '../lib/investorStore';

interface InvestorPortalProps {
  token?: string;
  onBack?: () => void;
}

interface ChatMessage {
  id: string;
  role: 'investor' | 'agent';
  text: string;
  timestamp: string;
}

export default function InvestorPortal({ token, onBack }: InvestorPortalProps) {
  const [activeView, setActiveView] = useState<'welcome' | 'agent' | 'loading'>('loading');
  const [sessionData, setSessionData] = useState<{
    investor?: InvestorRecord;
    assignment?: InvestorAgentAssignment;
  } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showRequestMeeting, setShowRequestMeeting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(true);

  useEffect(() => {
    if (token) {
      loadSession(token);
    } else {
      setActiveView('welcome');
    }
  }, [token]);

  async function loadSession(tokenStr: string) {
    try {
      const inviteToken = await getTokenByString(tokenStr);

      if (!inviteToken || inviteToken.status !== 'active') {
        setError('Invalid or expired activation link.');
        setSessionActive(false);
        setActiveView('welcome');
        return;
      }

      // Fetch actual assignment to check if suspended
      const assignments = await getAssignmentsByInvestor(inviteToken.investorId);
      const assignment = assignments.find(a => a.assignmentId === inviteToken.assignmentId);

      if (!assignment) {
        setError('Agent assignment not found.');
        setSessionActive(false);
        setActiveView('welcome');
        return;
      }

      if (assignment.status === 'suspended') {
        setError('This investor account has been suspended. Access denied.');
        setSessionActive(false);
        setActiveView('welcome');
        return;
      }

      if (assignment.status === 'revoked') {
        setError('This investor account has been revoked. Access denied.');
        setSessionActive(false);
        setActiveView('welcome');
        return;
      }

      setSessionData({
        assignment
      });

      // Add welcome message from agent
      setMessages([
        {
          id: 'welcome-1',
          role: 'agent',
          text: 'Welcome to LeeWay! I am your Investor Relations Agent. I am here to help you understand our platform, explore our product lines, and answer any questions you may have about LeeWay and Agent Lee.',
          timestamp: new Date().toISOString()
        }
      ]);

      setActiveView('agent');
    } catch (err) {
      console.error('Session load failed:', err);
      setError('Failed to initialize session.');
      setActiveView('welcome');
    }
  }

  async function handleSendMessage() {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'investor',
      text: inputText,
      timestamp: new Date().toISOString()
    };

    setMessages([...messages, userMessage]);
    setInputText('');

    // Simulate agent response (in real implementation, would call API)
    setTimeout(() => {
      const agentResponses: Record<string, string> = {
        'what is leeway': 'LeeWay is a comprehensive platform for deploying and managing AI-powered digital professionals. It provides governance, standards, and secure execution environments for specialized agent deployments.',
        'tell me about': 'LeeWay consists of several key components: the Employment Center for workforce management, the Learning Platform for knowledge management, Edge services for GPU, RTC, IoT, and Device control, and our comprehensive governance standards.',
        'product lines': 'Our product lines include: 1) Agent Lee Motherboard for orchestration, 2) Employment Center for digital workforce management, 3) Learning Platform for knowledge systems, 4) Edge services (GPU, RTC, Device, IoT), and 5) LeeWay Standards for governance.',
        'permissions': 'As an investor, you have permissions to view our system overview, explore product lines, ask questions, view demos, submit feedback, and request follow-up meetings - all while maintaining strict governance boundaries.',
        'governance': 'All investor interactions are governed by LeeWay Standards. We maintain strict separation between investor access and admin controls. Your permissions are limited to viewing content and submitting feedback.',
        'default': 'That is an excellent question about LeeWay. I can provide information about our platform architecture, product capabilities, governance model, deployment options, and our vision for AI-powered digital professionals. What would you like to explore?'
      };

      const lowerText = inputText.toLowerCase();
      let response = agentResponses.default;

      for (const [key, value] of Object.entries(agentResponses)) {
        if (lowerText.includes(key)) {
          response = value;
          break;
        }
      }

      const agentMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'agent',
        text: response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, agentMessage]);
    }, 800);
  }

  function handleRequestMeeting() {
    setMessages(prev => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        role: 'investor',
        text: 'I would like to request a follow-up meeting.',
        timestamp: new Date().toISOString()
      },
      {
        id: `msg-${Date.now() + 1}`,
        role: 'agent',
        text: 'Thank you for your interest in a follow-up meeting. Your request has been recorded and our team will contact you shortly to schedule a convenient time. We look forward to discussing LeeWay in detail.',
        timestamp: new Date().toISOString()
      }
    ]);
    setShowRequestMeeting(false);
  }

  const voiceAvailable = false; // Voice not available in this environment

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-b border-black/10 px-6 py-4 flex items-center justify-between sticky top-0 z-10"
      >
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-black/5 rounded-full transition-all"
              title="Back"
            >
              <ArrowLeft size={16} className="text-[#1A1A1A]" />
            </button>
          )}
          <div>
            <h1 className="text-lg font-bold text-[#1A1A1A]">Investor Relations Portal</h1>
            <p className="text-xs text-[#1A1A1A]/50">LeeWay Platform Overview</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {sessionActive ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 border border-emerald-200 rounded-full">
              <CheckCircle2 size={12} className="text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700">Session Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 border border-rose-200 rounded-full">
              <AlertCircle size={12} className="text-rose-600" />
              <span className="text-xs font-semibold text-rose-700">Session Expired</span>
            </div>
          )}
        </div>
      </motion.header>

      {/* Loading State */}
      {activeView === 'loading' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex items-center justify-center"
        >
          <div className="text-center space-y-4">
            <Loader size={32} className="animate-spin text-[#1A1A1A] mx-auto" />
            <p className="text-[#1A1A1A]/60">Initializing investor session...</p>
          </div>
        </motion.div>
      )}

      {/* Welcome View */}
      {activeView === 'welcome' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex items-center justify-center p-6"
        >
          <div className="max-w-md text-center space-y-6 bg-white p-8 rounded-lg border border-black/10">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto flex items-center justify-center">
              <Zap size={32} className="text-white" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">Welcome to LeeWay</h2>
              <p className="text-sm text-[#1A1A1A]/60">
                {error ? error : 'Please provide a valid activation link to access the investor portal.'}
              </p>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex gap-2">
                <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-rose-700">Link may be expired or invalid. Contact your administrator.</p>
              </div>
            )}

            {!error && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
                <Home size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">Go back to copy your activation link from the admin portal.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Agent Chat View */}
      {activeView === 'agent' && sessionActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* Quick Prompts */}
          <div className="border-b border-black/10 px-6 py-4 bg-white">
            <p className="text-xs font-semibold text-[#1A1A1A]/60 uppercase mb-3">Quick Questions</p>
            <div className="flex gap-2 flex-wrap">
              {[
                'What is LeeWay?',
                'Tell me about products',
                'Explain governance',
                'Learn about permissions'
              ].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setInputText(prompt)}
                  className="px-3 py-1.5 bg-black/5 hover:bg-black/10 text-xs font-semibold text-[#1A1A1A] rounded-full transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex',
                    msg.role === 'investor' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-xs lg:max-w-md px-4 py-3 rounded-lg',
                      msg.role === 'investor'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white text-[#1A1A1A] border border-black/10 rounded-bl-none'
                    )}
                  >
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    <p className={cn(
                      'text-xs mt-1.5 opacity-60',
                      msg.role === 'investor' ? 'text-white' : 'text-[#1A1A1A]'
                    )}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Input Area */}
          <div className="border-t border-black/10 bg-white p-6 space-y-4">
            {/* Voice Status */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
              <Mic size={14} className="flex-shrink-0 mt-0.5" />
              <span>Voice unavailable in this browser/session. Text mode active.</span>
            </div>

            {/* Chat Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me about LeeWay..."
                className="flex-1 px-4 py-3 bg-white border border-black/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                <Send size={14} />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowRequestMeeting(true)}
                className="px-4 py-2 bg-black/5 hover:bg-black/10 text-xs font-semibold text-[#1A1A1A] rounded flex items-center justify-center gap-2 transition-all"
              >
                <Calendar size={14} />
                Request Meeting
              </button>
              <button
                onClick={() => setMessages(prev => [...prev, {
                  id: `msg-${Date.now()}`,
                  role: 'investor',
                  text: 'Thank you for the information. I have more questions I would like to submit.',
                  timestamp: new Date().toISOString()
                }, {
                  id: `msg-${Date.now() + 1}`,
                  role: 'agent',
                  text: 'Excellent. Your feedback and additional questions have been recorded. Our team will review them and follow up with you.',
                  timestamp: new Date().toISOString()
                }])}
                className="px-4 py-2 bg-black/5 hover:bg-black/10 text-xs font-semibold text-[#1A1A1A] rounded flex items-center justify-center gap-2 transition-all"
              >
                <Plus size={14} />
                Submit Feedback
              </button>
            </div>

            {/* Session Info */}
            <div className="text-xs text-[#1A1A1A]/50 text-center p-2 border-t border-black/5 pt-4">
              Session governed by LeeWay Standards. All interactions are recorded and audited.
            </div>
          </div>

          {/* Request Meeting Modal */}
          <AnimatePresence>
            {showRequestMeeting && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              >
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                  className="bg-white rounded-lg p-6 max-w-sm space-y-4"
                >
                  <h3 className="text-lg font-semibold text-[#1A1A1A]">Request Follow-up Meeting</h3>
                  <p className="text-sm text-[#1A1A1A]/60">
                    We would be happy to schedule a dedicated meeting to discuss LeeWay in more detail.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRequestMeeting}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded font-semibold text-sm hover:bg-blue-700 transition-all"
                    >
                      Confirm Request
                    </button>
                    <button
                      onClick={() => setShowRequestMeeting(false)}
                      className="flex-1 px-4 py-2 border border-black/10 text-[#1A1A1A] rounded font-semibold text-sm hover:bg-black/5 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
