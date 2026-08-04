/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: DATA
 * TAG: DATA.MODULE.PLACEHOLDER
 * DESCRIPTION: Leeway IDE data module
 * AUTHORITY: LeeWay-Standards
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Data Module
 * WHY = Provide data structures
 * WHO = Leeway Innovations / Agent Lee Enablement
 * WHERE = FILEPATH
 * WHEN = 2026-06-06
 * HOW = TypeScript module
 *
 * CHAIN: Standards ? Integrated ? Runtime ? Projections
 * LICENSE: PROPRIETARY
 */

import { WorkspaceFile } from "../types";

export const INITIAL_FILES: WorkspaceFile[] = [
  {
    path: "src/pages/Home.tsx",
    name: "Home.tsx",
    language: "typescript",
    content: `import { useTasks } from '../hooks/useTasks';
import { Header } from '../components/Header';
import { TaskCard } from '../components/TaskCard';
import { Button } from '../components/Button';

export default function Home() {
  const { tasks, loading, addTask, toggleTask } = useTasks();

  return (
    <div className="page home bg-[#0d0e12] text-[#e3e4e6] min-h-screen p-4">
      <Header title="My Tasks" />
      <div className="actions flex justify-between items-center mb-6">
        <Button onClick={addTask} icon="plus">New Task</Button>
      </div>
      
      <div className="task-list space-y-3">
        {loading ? (
          <div className="loading py-8 text-center text-gray-500">Loading...</div>
        ) : tasks.length === 0 ? (
          <div className="className text-center py-12 text-gray-400">
            No tasks yet. Add your first task.
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onToggle={() => toggleTask(task.id)} 
            />
          ))
        )}
      </div>
    </div>
  );
}`
  },
  {
    path: "src/pages/Tasks.tsx",
    name: "Tasks.tsx",
    language: "typescript",
    content: `import { useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import { Header } from '../components/Header';
import { TaskCard } from '../components/TaskCard';

export default function Tasks() {
  const { tasks, toggleTask } = useTasks();
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const filteredTasks = tasks.filter(task => {
    if (filter === 'pending') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  });

  return (
    <div className="p-4 bg-[#0d0e12] min-h-screen text-white">
      <Header title="All Tasks" />
      <div className="flex space-x-2 my-4">
        {['all', 'pending', 'completed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={\`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all \${
              filter === f 
                ? 'bg-[#1b1c24] border border-[#ff3366] text-[#ff3366]' 
                : 'bg-[#12131a] hover:bg-[#1b1c24] text-gray-400 border border-transparent'
            }\`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {filteredTasks.map(task => (
          <TaskCard key={task.id} task={task} onToggle={() => toggleTask(task.id)} />
        ))}
      </div>
    </div>
  );
}`
  },
  {
    path: "src/pages/Analytics.tsx",
    name: "Analytics.tsx",
    language: "typescript",
    content: `import { useTasks } from '../hooks/useTasks';
import { Header } from '../components/Header';
import { Chart } from '../components/Chart';

export default function Analytics() {
  const { tasks } = useTasks();
  const completedCount = tasks.filter(t => t.completed).length;
  const pendingCount = tasks.length - completedCount;

  return (
    <div className="p-4 bg-[#0d0e12] min-h-screen text-white">
      <Header title="Task Analytics" />
      <div className="grid grid-cols-2 gap-4 my-4">
        <div className="bg-[#12131a] p-4 rounded-xl border border-white/5">
          <div className="text-gray-400 text-[10px] uppercase tracking-wider">Completed</div>
          <div className="text-2xl font-semibold text-emerald-400 mt-1">{completedCount}</div>
        </div>
        <div className="bg-[#12131a] p-4 rounded-xl border border-white/5">
          <div className="text-gray-400 text-[10px] uppercase tracking-wider">Pending</div>
          <div className="text-2xl font-semibold text-[#ff3366] mt-1">{pendingCount}</div>
        </div>
      </div>
      <div className="my-6">
        <Chart completed={completedCount} pending={pendingCount} />
      </div>
    </div>
  );
}`
  },
  {
    path: "src/components/Header.tsx",
    name: "Header.tsx",
    language: "typescript",
    content: `interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="flex justify-between items-center py-4 border-b border-white/5 mb-6">
      <h1 className="text-xl font-semibold tracking-tight text-white">{title}</h1>
      <div className="flex items-center space-x-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Synced</span>
      </div>
    </header>
  );
}`
  },
  {
    path: "src/components/TaskCard.tsx",
    name: "TaskCard.tsx",
    language: "typescript",
    content: `import { CheckSquare, Square, Clock } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  category?: string;
}

interface TaskCardProps {
  task: Task;
  onToggle: () => void;
}

export function TaskCard({ task, onToggle }: TaskCardProps) {
  return (
    <div 
      onClick={onToggle}
      className={\`flex items-center justify-between p-4 rounded-xl transition-all border cursor-pointer \${
        task.completed 
          ? 'bg-[#12131a]/50 border-emerald-500/10 text-gray-500 line-through' 
          : 'bg-[#12131a] hover:bg-[#1b1c24] border-white/5 text-white hover:border-white/10'
      }\`}
    >
      <div className="flex items-center space-x-3">
        {task.completed ? (
          <CheckSquare className="w-5 h-5 text-emerald-500 shrink-0" />
        ) : (
          <Square className="w-5 h-5 text-gray-500 hover:text-[#ff3366] shrink-0" />
        )}
        <div>
          <p className="text-sm font-medium tracking-tight">{task.title}</p>
          {task.dueDate && (
            <span className="flex items-center text-[10px] text-gray-500 mt-1">
              <Clock className="w-3 h-3 mr-1" />
              {task.dueDate}
            </span>
          )}
        </div>
      </div>
      {task.category && (
        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 text-gray-400">
          {task.category}
        </span>
      )}
    </div>
  );
}`
  },
  {
    path: "src/components/Chart.tsx",
    name: "Chart.tsx",
    language: "typescript",
    content: `interface ChartProps {
  completed: number;
  pending: number;
}

export function Chart({ completed, pending }: ChartProps) {
  const total = completed + pending || 1;
  const percent = Math.round((completed / total) * 100);

  return (
    <div className="bg-[#12131a] p-5 rounded-2xl border border-white/5">
      <h3 className="text-sm font-semibold tracking-tight text-white mb-4">Completion Progress</h3>
      <div className="relative pt-1">
        <div className="flex mb-2 items-center justify-between">
          <div>
            <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-emerald-400 bg-emerald-500/10 font-mono">
              Task Ratio
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold inline-block text-emerald-400 font-mono">
              {percent}%
            </span>
          </div>
        </div>
        <div className="overflow-hidden h-2.5 text-xs flex rounded bg-[#1b1c24]">
          <div 
            style={{ width: \`\${percent}%\` }}
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
          />
        </div>
      </div>
      <div className="flex justify-between text-[11px] text-gray-400 font-mono mt-4">
        <span>Pending: {pending}</span>
        <span>Completed: {completed}</span>
      </div>
    </div>
  );
}`
  },
  {
    path: "src/components/Button.tsx",
    name: "Button.tsx",
    language: "typescript",
    content: `import { Plus, Check, ArrowRight } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: 'plus' | 'check' | 'arrow';
}

export function Button({ children, icon, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={\`flex items-center justify-center space-x-1 px-4 py-2 bg-gradient-to-r from-[#ff3366] to-[#ff5d50] text-white rounded-xl text-xs font-semibold tracking-wide hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#ff3366]/20 \${className}\`}
      {...props}
    >
      {icon === 'plus' && <Plus className="w-4 h-4" />}
      {icon === 'check' && <Check className="w-4 h-4" />}
      {icon === 'arrow' && <ArrowRight className="w-4 h-4" />}
      <span>{children}</span>
    </button>
  );
}`
  },
  {
    path: "src/hooks/useTasks.ts",
    name: "useTasks.ts",
    language: "typescript",
    content: `import { useState, useEffect } from 'react';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string;
  category: string;
}

const DEFAULT_TASKS: Task[] = [
  { id: '1', title: 'Design new dashboard layout', completed: true, dueDate: 'Today', category: 'Design' },
  { id: '2', title: 'Review analytics integrations', completed: true, dueDate: 'Today', category: 'Review' },
  { id: '3', title: 'Implement system webhook events', completed: false, dueDate: 'Tomorrow', category: 'Engineering' },
  { id: '4', title: 'Run telemetry unit tests', completed: false, dueDate: 'Tomorrow', category: 'Testing' },
  { id: '5', title: 'Send customer loyalty onboarding check', completed: false, dueDate: 'Next week', category: 'Marketing' }
];

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('leeway_tasks');
    return saved ? JSON.parse(saved) : DEFAULT_TASKS;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('leeway_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const addTask = (title?: string) => {
    const fresh: Task = {
      id: Date.now().toString(),
      title: title || 'New Task from Automation Trigger',
      completed: false,
      dueDate: 'Today',
      category: 'Unassigned'
    };
    setTasks(prev => [fresh, ...prev]);
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  return { tasks, loading, addTask, toggleTask };
}`
  },
  {
    path: "src/services/api.ts",
    name: "api.ts",
    language: "typescript",
    content: `// Dynamic gateway proxies for local app interactions
export async function sendWebhook(event: string, payload: any) {
  console.log(\`[Webhook Sent] Event: \${event}\`, payload);
  try {
    const res = await fetch('/api/webhook', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, payload })
    });
    return await res.json();
  } catch (err) {
    return { status: 'offline-queued', payload };
  }
}`
  },
  {
    path: "src/services/storage.ts",
    name: "storage.ts",
    language: "typescript",
    content: `// Persisted local keystore engine
export function getLocalKey<T>(key: string, defaultValue: T): T {
  try {
    const record = localStorage.getItem(key);
    return record ? JSON.parse(record) : defaultValue;
  } catch {
    return defaultValue;
  }
}`
  },
  {
    path: "src/styles/theme.css",
    name: "theme.css",
    language: "css",
    content: `:root {
  --leeway-bg: #07080a;
  --leeway-card-bg: #0d0e12;
  --leeway-accent: #ff3366;
  --leeway-text-primary: #f3f4f6;
  --leeway-text-secondary: #9ca3af;
}

body {
  background-color: var(--leeway-bg);
  color: var(--leeway-text-primary);
  font-family: 'Inter', system-ui, sans-serif;
}`
  },
  {
    path: "automation/workflows.json",
    name: "workflows.json",
    language: "json",
    content: `{
  "id": "workflow-user-onboarding",
  "name": "User Onboarding Flow",
  "active": true,
  "nodes": [
    { "id": "trig-1", "type": "trigger", "label": "New User Sign-up", "x": 100, "y": 150 },
    { "id": "act-1", "type": "action", "label": "Create Account DB Row", "x": 300, "y": 150 },
    { "id": "act-2", "type": "action", "label": "Send Verification Email", "x": 500, "y": 150 },
    { "id": "act-3", "type": "action", "label": "Add to Active CRM campaign", "x": 300, "y": 300 },
    { "id": "act-4", "type": "action", "label": "Telemetry audit logging", "x": 500, "y": 300 }
  ]
}`
  },
  {
    path: "package.json",
    name: "package.json",
    language: "json",
    content: `{
  "name": "my-tasks-app",
  "version": "1.0.0",
  "dependencies": {
    "react": "^19.0.0",
    "tailwindcss": "@latest",
    "lucide-react": "^0.450.0"
  }
}`
  },
  {
    path: "README.md",
    name: "README.md",
    language: "markdown",
    content: `# MyApp Task Manager

This is a premium React application incorporating:
- Mobile-first responsive UI
- Offline storage syncing
- Real-time event notifications via Webhook and n8n automations
- Sleek analytics components
`
  }
];
