'use client';

import { useEffect, useState, useCallback } from 'react';

const API_BASE = '/api/leeway/master-publisher';

interface Project {
  id: string; title: string; kind: string; audience: string; brief: string;
  status: string; sections: any[]; checkpoints: any[];
  providerLinks: any[]; sourceLinks: any[]; notebookLinks: any[];
  created_at: string; updated_at: string;
}

interface ResearchSource {
  id: string; project_id: string; title: string; url: string;
  summary: string; source_type: string; created_at: string;
}

interface Claim {
  id: string; project_id: string; claim_text: string;
  status: string; confidence: number; validation_notes: string;
  created_at: string;
}

interface NotebookLink {
  id: string; project_id: string; notebook_id: string; updated_at: string;
}

type Tab = 'dashboard' | 'projects' | 'sources' | 'claims' | 'notebooks';

async function api(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'content-type': 'application/json', ...opts?.headers },
    ...opts,
  });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, body: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, body: text }; }
}

function Input({ label, value, onChange, placeholder, disabled }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-gray-400">
      {label}
      <input
        className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:border-blue-500 outline-none disabled:opacity-50"
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
      />
    </label>
  );
}

function Button({ onClick, children, disabled, variant }: { onClick: () => void; children: React.ReactNode; disabled?: boolean; variant?: 'primary' | 'danger' }) {
  const base = 'px-4 py-2 rounded text-sm font-medium transition disabled:opacity-50';
  const styles = variant === 'danger' ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-blue-700 hover:bg-blue-600 text-white';
  return <button className={`${base} ${styles}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Card({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-4 ${className || ''}`}>
      {title && <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>}
      {children}
    </div>
  );
}

export default function MasterPublisherUI() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [health, setHealth] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [notebooks, setNotebooks] = useState<NotebookLink[]>([]);

  const [newProject, setNewProject] = useState({ title: '', kind: 'book', audience: 'general', brief: '' });
  const [newSource, setNewSource] = useState({ title: '', url: '', content: '', sourceType: 'web' });
  const [newClaim, setNewClaim] = useState({ claimText: '' });
  const [newNotebook, setNewNotebook] = useState({ notebookId: '' });
  const [validateCitation, setValidateCitation] = useState({ claimText: '', citationText: '' });
  const [validationResult, setValidationResult] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [askResult, setAskResult] = useState<any>(null);
  const [askQuestion, setAskQuestion] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchHealth = useCallback(async () => {
    const r = await api('/health');
    if (r.ok) setHealth(r.body);
  }, []);

  const fetchProjects = useCallback(async () => {
    const r = await api('/api/projects');
    if (r.ok) setProjects(Array.isArray(r.body) ? r.body : []);
  }, []);

  const fetchProject = useCallback(async (id: string) => {
    const r = await api(`/api/projects/${id}`);
    if (r.ok) setSelectedProject(r.body);
  }, []);

  const fetchSources = useCallback(async (projectId: string) => {
    const r = await api(`/api/projects/${projectId}/sources`);
    if (r.ok) setSources(r.body?.researchSources || []);
  }, []);

  const fetchClaims = useCallback(async (projectId: string) => {
    const r = await api(`/api/projects/${projectId}/claims`);
    if (r.ok) setClaims(r.body?.claims || []);
  }, []);

  const fetchNotebooks = useCallback(async (projectId: string) => {
    const r = await api(`/api/projects/${projectId}/notebooks`);
    if (r.ok) setNotebooks(r.body?.notebooks || []);
  }, []);

  useEffect(() => { fetchHealth(); fetchProjects(); }, [fetchHealth, fetchProjects]);

  const selectProject = async (id: string) => {
    setLoading(true); setError('');
    try {
      await fetchProject(id);
      await fetchSources(id);
      await fetchClaims(id);
      await fetchNotebooks(id);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const createProject = async () => {
    setLoading(true); setError('');
    const r = await api('/api/projects', {
      method: 'POST', body: JSON.stringify(newProject),
    });
    if (r.ok) { setNewProject({ title: '', kind: 'book', audience: 'general', brief: '' }); await fetchProjects(); }
    else setError(r.body?.error || 'Failed');
    setLoading(false);
  };

  const addSource = async () => {
    if (!selectedProject) return;
    setLoading(true); setError('');
    const r = await api('/api/open-notebook/sources', {
      method: 'POST', body: JSON.stringify({ projectId: selectedProject.id, ...newSource }),
    });
    if (r.ok) { setNewSource({ title: '', url: '', content: '', sourceType: 'web' }); await fetchSources(selectedProject.id); }
    else setError(r.body?.error || 'Failed');
    setLoading(false);
  };

  const addClaim = async () => {
    if (!selectedProject) return;
    setLoading(true); setError('');
    const r = await api('/api/open-notebook/claims', {
      method: 'POST', body: JSON.stringify({ projectId: selectedProject.id, ...newClaim }),
    });
    if (r.ok) { setNewClaim({ claimText: '' }); await fetchClaims(selectedProject.id); }
    else setError(r.body?.error || 'Failed');
    setLoading(false);
  };

  const linkNotebook = async () => {
    if (!selectedProject) return;
    setLoading(true); setError('');
    const r = await api(`/api/projects/${selectedProject.id}/notebooks/link`, {
      method: 'POST', body: JSON.stringify(newNotebook),
    });
    if (r.ok) { setNewNotebook({ notebookId: '' }); await fetchNotebooks(selectedProject.id); }
    else setError(r.body?.error || 'Failed');
    setLoading(false);
  };

  const unlinkNotebook = async (notebookId: string) => {
    if (!selectedProject) return;
    const r = await api(`/api/projects/${selectedProject.id}/notebooks/${notebookId}`, { method: 'DELETE' });
    if (r.ok) await fetchNotebooks(selectedProject.id);
    else setError(r.body?.error || 'Failed');
  };

  const runSearch = async () => {
    if (!selectedProject || !searchQuery) return;
    setLoading(true);
    const r = await api('/api/open-notebook/research/search', {
      method: 'POST', body: JSON.stringify({ projectId: selectedProject.id, query: searchQuery }),
    });
    if (r.ok) setSearchResult(r.body);
    setLoading(false);
  };

  const runAsk = async () => {
    if (!selectedProject || !askQuestion) return;
    setLoading(true);
    const r = await api('/api/open-notebook/ask-sources', {
      method: 'POST', body: JSON.stringify({ projectId: selectedProject.id, question: askQuestion, sourceIds: [] }),
    });
    if (r.ok) setAskResult(r.body);
    setLoading(false);
  };

  const runValidate = async () => {
    setLoading(true); setValidationResult(null);
    const r = await api('/api/open-notebook/claims/validate', {
      method: 'POST', body: JSON.stringify(validateCitation),
    });
    if (r.ok) setValidationResult(r.body);
    setLoading(false);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'projects', label: 'Projects' },
    { key: 'sources', label: 'Sources' },
    { key: 'claims', label: 'Claims' },
    { key: 'notebooks', label: 'Notebooks' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 p-6">
      <header className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-white">Master Publisher</h1>
          {health && (
            <p className="text-sm text-gray-400 mt-1">
              Runtime: <span className={health.status === 'HEALTHY' ? 'text-green-400' : 'text-red-400'}>{health.status}</span>
              {' | '}DB: {health.database?.status}
              {' | '}Ollama: {health.ollama?.ok ? '✅' : '❌'}
              {' | '}Projects: {projects.length}
            </p>
          )}
        </div>
        <nav className="flex gap-2">
          {tabs.map(t => (
            <button key={t.key}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.key ? 'bg-blue-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
              onClick={() => setTab(t.key)}
            >{t.label}</button>
          ))}
        </nav>
      </header>

      {error && <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}

      {tab === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card title="Projects"><p className="text-3xl font-bold text-white">{projects.length}</p></Card>
          <Card title="Sources"><p className="text-3xl font-bold text-white">{sources.length}</p></Card>
          <Card title="Claims"><p className="text-3xl font-bold text-white">{claims.length}</p></Card>
          <Card title="Notebooks"><p className="text-3xl font-bold text-white">{notebooks.length}</p></Card>
        </div>
      )}

      {tab === 'projects' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="Create Project">
            <div className="flex flex-col gap-3">
              <Input label="Title" value={newProject.title} onChange={v => setNewProject(p => ({ ...p, title: v }))} placeholder="Project title" />
              <Input label="Kind" value={newProject.kind} onChange={v => setNewProject(p => ({ ...p, kind: v }))} placeholder="book, article, research" />
              <Input label="Audience" value={newProject.audience} onChange={v => setNewProject(p => ({ ...p, audience: v }))} placeholder="general, technical" />
              <Input label="Brief" value={newProject.brief} onChange={v => setNewProject(p => ({ ...p, brief: v }))} placeholder="Project brief" />
              <Button onClick={createProject} disabled={loading}>Create Project</Button>
            </div>
          </Card>
          <Card title="Projects" className="lg:col-span-2">
            <div className="grid gap-3 max-h-[70vh] overflow-y-auto">
              {projects.map(p => (
                <div key={p.id}
                  className={`p-3 rounded-lg border cursor-pointer transition ${selectedProject?.id === p.id ? 'border-blue-600 bg-blue-900/20' : 'border-gray-800 hover:border-gray-600 bg-gray-900'}`}
                  onClick={() => selectProject(p.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-white">{p.title || 'Untitled'}</p>
                      <p className="text-xs text-gray-400">{p.kind} · {p.audience} · {p.status}</p>
                      {p.brief && <p className="text-xs text-gray-500 mt-1">{p.brief}</p>}
                    </div>
                    <p className="text-xs text-gray-500">{new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {projects.length === 0 && <p className="text-gray-500 text-sm">No projects yet</p>}
            </div>
          </Card>
          {selectedProject && (
            <Card title={`Project: ${selectedProject.title}`} className="lg:col-span-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                <div><span className="text-gray-400">ID:</span> <span className="text-gray-200">{selectedProject.id.slice(0, 12)}...</span></div>
                <div><span className="text-gray-400">Kind:</span> <span className="text-gray-200">{selectedProject.kind}</span></div>
                <div><span className="text-gray-400">Status:</span> <span className="text-gray-200">{selectedProject.status}</span></div>
                <div><span className="text-gray-400">Sections:</span> <span className="text-gray-200">{selectedProject.sections?.length || 0}</span></div>
                <div><span className="text-gray-400">Sources:</span> <span className="text-gray-200">{selectedProject.sourceLinks?.length || 0}</span></div>
                <div><span className="text-gray-400">Claims:</span> <span className="text-gray-200">{selectedProject.providerLinks?.length || 0}</span></div>
                <div><span className="text-gray-400">Notebooks:</span> <span className="text-gray-200">{selectedProject.notebookLinks?.length || 0}</span></div>
                <div><span className="text-gray-400">Brief:</span> <span className="text-gray-200">{selectedProject.brief}</span></div>
              </div>
              {selectedProject.sections?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Sections</h4>
                  <div className="space-y-1">
                    {selectedProject.sections.map((s: any) => (
                      <div key={s.id} className="text-xs text-gray-400 flex gap-2">
                        <span className={s.status === 'COMPLETE' ? 'text-green-400' : 'text-yellow-400'}>{s.status === 'COMPLETE' ? '✅' : '⏳'}</span>
                        <span>{s.sequence}. {s.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {tab === 'sources' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="Add Research Source">
            <div className="flex flex-col gap-3">
              {!selectedProject && <p className="text-sm text-yellow-400">Select a project first</p>}
              <Input label="Title" value={newSource.title} onChange={v => setNewSource(s => ({ ...s, title: v }))} disabled={!selectedProject} />
              <Input label="URL" value={newSource.url} onChange={v => setNewSource(s => ({ ...s, url: v }))} disabled={!selectedProject} />
              <Input label="Content" value={newSource.content} onChange={v => setNewSource(s => ({ ...s, content: v }))} disabled={!selectedProject} />
              <Input label="Source Type" value={newSource.sourceType} onChange={v => setNewSource(s => ({ ...s, sourceType: v }))} disabled={!selectedProject} />
              <Button onClick={addSource} disabled={loading || !selectedProject}>Add Source</Button>
            </div>
          </Card>
          <Card title="Research Sources" className="lg:col-span-2">
            {!selectedProject ? (
              <p className="text-sm text-gray-500">Select a project to view sources</p>
            ) : sources.length === 0 ? (
              <p className="text-sm text-gray-500">No research sources for this project</p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {sources.map(s => (
                  <div key={s.id} className="p-3 bg-gray-900 rounded-lg border border-gray-800">
                    <div className="flex justify-between">
                      <p className="font-medium text-white">{s.title}</p>
                      <p className="text-xs text-gray-500">{s.source_type}</p>
                    </div>
                    {s.url && <p className="text-xs text-blue-400 mt-1">{s.url}</p>}
                    {s.summary && <p className="text-xs text-gray-400 mt-1">{s.summary}</p>}
                    <p className="text-xs text-gray-600 mt-1">{new Date(s.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card title="Search Sources" className="lg:col-span-3">
            {!selectedProject ? (
              <p className="text-sm text-gray-500">Select a project first</p>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <input className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)} placeholder="Search query..." />
                  <Button onClick={runSearch} disabled={loading}>Search</Button>
                </div>
                {searchResult && (
                  <div className="p-3 bg-gray-900 rounded-lg border border-gray-800">
                    <p className="text-sm text-gray-400">Found {searchResult.results?.length || 0} results in {searchResult.totalSources} sources</p>
                    {searchResult.results?.map((r: any, i: number) => (
                      <div key={i} className="mt-2 p-2 bg-gray-800 rounded text-sm">
                        <p className="font-medium text-white">{r.title}</p>
                        <p className="text-gray-400">{r.relevance}</p>
                        {r.excerpt && <p className="text-gray-500 text-xs mt-1">{r.excerpt}</p>}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-3 mt-2">
                  <input className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" value={askQuestion}
                    onChange={e => setAskQuestion(e.target.value)} placeholder="Ask a question about sources..." />
                  <Button onClick={runAsk} disabled={loading}>Ask</Button>
                </div>
                {askResult && (
                  <div className="p-3 bg-gray-900 rounded-lg border border-gray-800">
                    <p className="text-sm text-gray-400">Answered from {askResult.sourcesUsed} source(s):</p>
                    <p className="text-white mt-1">{askResult.answer}</p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'claims' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="Create Claim">
            <div className="flex flex-col gap-3">
              {!selectedProject && <p className="text-sm text-yellow-400">Select a project first</p>}
              <Input label="Claim Text" value={newClaim.claimText} onChange={v => setNewClaim({ claimText: v })} disabled={!selectedProject} />
              <Button onClick={addClaim} disabled={loading || !selectedProject}>Create Claim</Button>
            </div>
          </Card>
          <Card title="Claims" className="lg:col-span-2">
            {!selectedProject ? (
              <p className="text-sm text-gray-500">Select a project to view claims</p>
            ) : claims.length === 0 ? (
              <p className="text-sm text-gray-500">No claims for this project</p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {claims.map(c => (
                  <div key={c.id} className="p-3 bg-gray-900 rounded-lg border border-gray-800">
                    <div className="flex justify-between items-start">
                      <p className="text-white">{c.claim_text}</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        c.status === 'VERIFIED' ? 'bg-green-900 text-green-300' :
                        c.status === 'REJECTED' ? 'bg-red-900 text-red-300' :
                        'bg-yellow-900 text-yellow-300'
                      }`}>{c.status}</span>
                    </div>
                    {c.confidence > 0 && <p className="text-xs text-gray-400 mt-1">Confidence: {(c.confidence * 100).toFixed(0)}%</p>}
                    {c.validation_notes && <p className="text-xs text-gray-500 mt-1">{c.validation_notes}</p>}
                    <p className="text-xs text-gray-600 mt-1">{new Date(c.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card title="Validate Citation" className="lg:col-span-3">
            <div className="flex flex-col gap-3">
              <Input label="Claim Text" value={validateCitation.claimText} onChange={v => setValidateCitation(c => ({ ...c, claimText: v }))} />
              <Input label="Citation Text" value={validateCitation.citationText} onChange={v => setValidateCitation(c => ({ ...c, citationText: v }))} />
              <Button onClick={runValidate} disabled={loading}>Validate</Button>
              {validationResult && (
                <div className={`p-3 rounded-lg border ${validationResult.supported ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'}`}>
                  <p className="font-medium text-white">{validationResult.supported ? '✅ Supported' : '❌ Not Supported'}</p>
                  <p className="text-sm text-gray-400">Confidence: {(validationResult.confidence * 100).toFixed(0)}%</p>
                  {validationResult.reason && <p className="text-sm text-gray-500 mt-1">{validationResult.reason}</p>}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {tab === 'notebooks' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="Link Notebook">
            <div className="flex flex-col gap-3">
              {!selectedProject && <p className="text-sm text-yellow-400">Select a project first</p>}
              <Input label="Notebook ID" value={newNotebook.notebookId} onChange={v => setNewNotebook({ notebookId: v })} disabled={!selectedProject} placeholder="nb-..." />
              <Button onClick={linkNotebook} disabled={loading || !selectedProject}>Link Notebook</Button>
            </div>
          </Card>
          <Card title="Linked Notebooks" className="lg:col-span-2">
            {!selectedProject ? (
              <p className="text-sm text-gray-500">Select a project to view linked notebooks</p>
            ) : notebooks.length === 0 ? (
              <p className="text-sm text-gray-500">No notebooks linked to this project</p>
            ) : (
              <div className="space-y-2">
                {notebooks.map(n => (
                  <div key={n.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-800">
                    <div>
                      <p className="font-mono text-sm text-white">{n.notebook_id}</p>
                      <p className="text-xs text-gray-500">Linked {new Date(n.updated_at).toLocaleString()}</p>
                    </div>
                    <button className="text-red-400 hover:text-red-300 text-sm" onClick={() => unlinkNotebook(n.notebook_id)}>Unlink</button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
