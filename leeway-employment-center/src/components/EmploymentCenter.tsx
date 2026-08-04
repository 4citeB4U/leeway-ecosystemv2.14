/*
FILE: src\components\EmploymentCenter.tsx
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: UI.COMPONENT.E_MP_LO_YM_EN_TC_EN_TE_R.MAIN
REGION: 🔵 UI
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: Inferred by verification scanner
EXPORTS: Inferred by verification scanner
STATUS: ACTIVE
*/
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    Search, Briefcase, Building2, Terminal, Shield, 
    ArrowRight, CheckCircle2, AlertCircle, Upload, 
    FileText, UserPlus, Zap, LayoutDashboard, Settings2,
    Users, Plus, CreditCard, ChevronRight, ChevronLeft, X, Play, User
} from 'lucide-react';
import { IntakeForm, EmployeeVM, JobFamily, IdentityProfile, SkillBlock } from '../types';
import { cn, generateId } from '../lib/utils';
import { EMPLOYEE_FACE_ASSIGNMENTS } from '../lib/employeeFaces';
import { createGovernedEmployee } from '../lib/workforceFactory';
import { useWorkforceStore } from '../lib/workforceStore';
import { EmployeeCard, ContractCard, JOB_FAMILY_COLORS } from './Cards';
import AgentVM from './AgentVM';
import AdminConsole from './AdminConsole';
import EmployeeAvatar from './EmployeeAvatar';

const INDUSTRIES = [
    "Pet Retail", "Food Service", "Construction", 
    "Healthcare", "Logistics", "Customer Support",
    "Hospitality", "Education", "Quality Control",
    "Security", "Data Analysis", "Administrative",
    "HR & Legal", "Finance", "Energy & Utility", "Manufacturing"
];

const ENVIRONMENTS = [
    "Remote / Virtual",
    "On-site / Physical",
    "Hybrid",
    "Customer-Facing",
    "Internal / Back-Office",
    "Field Operations",
    "Technical / Diagnostic"
];

const VoxelAvatar: React.FC<{ profile: IdentityProfile, className?: string }> = ({ profile, className }) => {
    return (
        <EmployeeAvatar
            avatarUrl={profile.avatarUrl}
            alt={profile.name}
            gridPos={profile.gridPos}
            className={cn("w-full h-full bg-white", className)}
        />
    );
};

// Keep the role/name metadata here; current face-sheet assignments are applied below.
const VERIFIED_IDENTITIES_BASE: IdentityProfile[] = [
    // FILE 2: Outfits (20 faces)
    { id: "ID-001", employeeId: "EMP-10011", name: "Aria Vance", jobTitle: "Chief of Staff", avatarUrl: "input_file_2.png", jobFamily: "Admin", gridPos: { fileIndex: 2, row: 0, col: 0, totalRows: 4, totalCols: 5 } },
    { id: "ID-002", employeeId: "EMP-10012", name: "Marcus Thorne", jobTitle: "Logistics Director", avatarUrl: "input_file_2.png", jobFamily: "Operations", gridPos: { fileIndex: 2, row: 0, col: 1, totalRows: 4, totalCols: 5 } },
    { id: "ID-003", employeeId: "EMP-10013", name: "Elena Rossi", jobTitle: "Head Chef", avatarUrl: "input_file_2.png", jobFamily: "Inventory", gridPos: { fileIndex: 2, row: 0, col: 2, totalRows: 4, totalCols: 5 } },
    { id: "ID-004", employeeId: "EMP-10014", name: "Julian Chen", jobTitle: "Safety Operations", avatarUrl: "input_file_2.png", jobFamily: "Compliance", gridPos: { fileIndex: 2, row: 0, col: 3, totalRows: 4, totalCols: 5 } },
    { id: "ID-005", employeeId: "EMP-10015", name: "Sora Kim", jobTitle: "Senior Analyst", avatarUrl: "input_file_2.png", jobFamily: "AI", gridPos: { fileIndex: 2, row: 0, col: 4, totalRows: 4, totalCols: 5 } },
    { id: "ID-006", employeeId: "EMP-10016", name: "David Miller", jobTitle: "Corporate Counsel", avatarUrl: "input_file_2.png", jobFamily: "Admin", gridPos: { fileIndex: 2, row: 1, col: 0, totalRows: 4, totalCols: 5 } },
    { id: "ID-007", employeeId: "EMP-10017", name: "Cassian Blake", jobTitle: "Security Lead", avatarUrl: "input_file_2.png", jobFamily: "Security", gridPos: { fileIndex: 2, row: 1, col: 1, totalRows: 4, totalCols: 5 } },
    { id: "ID-008", employeeId: "EMP-10018", name: "Sophia Wu", jobTitle: "Strategy Associate", avatarUrl: "input_file_2.png", jobFamily: "Assistant", gridPos: { fileIndex: 2, row: 1, col: 2, totalRows: 4, totalCols: 5 } },
    { id: "ID-009", employeeId: "EMP-10019", name: "Leo Grant", jobTitle: "Support Specialist", avatarUrl: "input_file_2.png", jobFamily: "Sales", gridPos: { fileIndex: 2, row: 1, col: 3, totalRows: 4, totalCols: 5 } },
    { id: "ID-010", employeeId: "EMP-10020", name: "Mila Kunis", jobTitle: "Refuse Logistics", avatarUrl: "input_file_2.png", jobFamily: "Operations", gridPos: { fileIndex: 2, row: 1, col: 4, totalRows: 4, totalCols: 5 } },
    { id: "ID-011", employeeId: "EMP-10021", name: "Nolan Reed", jobTitle: "Supply Manager", avatarUrl: "input_file_2.png", jobFamily: "Inventory", gridPos: { fileIndex: 2, row: 2, col: 0, totalRows: 4, totalCols: 5 } },
    { id: "ID-012", employeeId: "EMP-10022", name: "Maya Angel", jobTitle: "QA Inspector", avatarUrl: "input_file_2.png", jobFamily: "Compliance", gridPos: { fileIndex: 2, row: 2, col: 1, totalRows: 4, totalCols: 5 } },
    { id: "ID-013", employeeId: "EMP-10023", name: "Silas Vane", jobTitle: "AI Modeler", avatarUrl: "input_file_2.png", jobFamily: "AI", gridPos: { fileIndex: 2, row: 2, col: 2, totalRows: 4, totalCols: 5 } },
    { id: "ID-014", employeeId: "EMP-10024", name: "Clara Oswald", jobTitle: "Executive Lead", avatarUrl: "input_file_2.png", jobFamily: "Admin", gridPos: { fileIndex: 2, row: 2, col: 3, totalRows: 4, totalCols: 5 } },
    { id: "ID-015", employeeId: "EMP-10025", name: "Ethan Hunt", jobTitle: "Project Manager", avatarUrl: "input_file_2.png", jobFamily: "Operations", gridPos: { fileIndex: 2, row: 2, col: 4, totalRows: 4, totalCols: 5 } },
    { id: "ID-016", employeeId: "EMP-10026", name: "Iris West", jobTitle: "Customer Liaison", avatarUrl: "input_file_2.png", jobFamily: "Assistant", gridPos: { fileIndex: 2, row: 3, col: 0, totalRows: 4, totalCols: 5 } },
    { id: "ID-017", employeeId: "EMP-10027", name: "Felix Drake", jobTitle: "Field Support", avatarUrl: "input_file_2.png", jobFamily: "Sales", gridPos: { fileIndex: 2, row: 3, col: 1, totalRows: 4, totalCols: 5 } },
    { id: "ID-018", employeeId: "EMP-10028", name: "Gia Santos", jobTitle: "Operations Tech", avatarUrl: "input_file_2.png", jobFamily: "Operations", gridPos: { fileIndex: 2, row: 3, col: 2, totalRows: 4, totalCols: 5 } },
    { id: "ID-019", employeeId: "EMP-10029", name: "Hugo Strange", jobTitle: "Legal Ops", avatarUrl: "input_file_2.png", jobFamily: "Admin", gridPos: { fileIndex: 2, row: 3, col: 3, totalRows: 4, totalCols: 5 } },
    { id: "ID-020", employeeId: "EMP-10030", name: "Jade Nguyen", jobTitle: "Compliance Lead", avatarUrl: "input_file_2.png", jobFamily: "Compliance", gridPos: { fileIndex: 2, row: 3, col: 4, totalRows: 4, totalCols: 5 } },
    
    // FILE 1: Diverse (25 faces)
    { id: "ID-021", employeeId: "EMP-11001", name: "Kael Vox", jobTitle: "Neural Architect", avatarUrl: "input_file_1.png", jobFamily: "AI", gridPos: { fileIndex: 1, row: 0, col: 0, totalRows: 5, totalCols: 5 } },
    { id: "ID-022", employeeId: "EMP-11002", name: "Luna Love", jobTitle: "Communications", avatarUrl: "input_file_1.png", jobFamily: "Assistant", gridPos: { fileIndex: 1, row: 0, col: 1, totalRows: 5, totalCols: 5 } },
    { id: "ID-023", employeeId: "EMP-11003", name: "Max Payne", jobTitle: "Field Op", avatarUrl: "input_file_1.png", jobFamily: "Operations", gridPos: { fileIndex: 1, row: 0, col: 2, totalRows: 5, totalCols: 5 } },
    { id: "ID-024", employeeId: "EMP-11004", name: "Nina Williams", jobTitle: "Lead Assistant", avatarUrl: "input_file_1.png", jobFamily: "Assistant", gridPos: { fileIndex: 1, row: 0, col: 3, totalRows: 5, totalCols: 5 } },
    { id: "ID-025", employeeId: "EMP-11005", name: "Oscar Isaac", jobTitle: "Sales Lead", avatarUrl: "input_file_1.png", jobFamily: "Sales", gridPos: { fileIndex: 1, row: 0, col: 4, totalRows: 5, totalCols: 5 } },
    { id: "ID-026", employeeId: "EMP-11006", name: "Penny Lane", jobTitle: "Logistics Tech", avatarUrl: "input_file_1.png", jobFamily: "Operations", gridPos: { fileIndex: 1, row: 1, col: 0, totalRows: 5, totalCols: 5 } },
    { id: "ID-027", employeeId: "EMP-11007", name: "Quinton Moss", jobTitle: "Inventory Specialist", avatarUrl: "input_file_1.png", jobFamily: "Inventory", gridPos: { fileIndex: 1, row: 1, col: 1, totalRows: 5, totalCols: 5 } },
    { id: "ID-028", employeeId: "EMP-11008", name: "Rana Dagg", jobTitle: "Compliance Tech", avatarUrl: "input_file_1.png", jobFamily: "Compliance", gridPos: { fileIndex: 1, row: 1, col: 2, totalRows: 5, totalCols: 5 } },
    { id: "ID-029", employeeId: "EMP-11009", name: "Seth Rollins", jobTitle: "AI Researcher", avatarUrl: "input_file_1.png", jobFamily: "AI", gridPos: { fileIndex: 1, row: 1, col: 3, totalRows: 5, totalCols: 5 } },
    { id: "ID-030", employeeId: "EMP-11010", name: "Tara Strong", jobTitle: "HR Partner", avatarUrl: "input_file_1.png", jobFamily: "Admin", gridPos: { fileIndex: 1, row: 1, col: 4, totalRows: 5, totalCols: 5 } },
    { id: "ID-031", employeeId: "EMP-11011", name: "Uriah Hall", jobTitle: "Security Officer", avatarUrl: "input_file_1.png", jobFamily: "Security", gridPos: { fileIndex: 1, row: 2, col: 0, totalRows: 5, totalCols: 5 } },
    { id: "ID-032", employeeId: "EMP-11012", name: "Vera Wang", jobTitle: "Design Assistant", avatarUrl: "input_file_1.png", jobFamily: "Assistant", gridPos: { fileIndex: 1, row: 2, col: 1, totalRows: 5, totalCols: 5 } },
    { id: "ID-033", employeeId: "EMP-11013", name: "Wyatt Earp", jobTitle: "Closer", avatarUrl: "input_file_1.png", jobFamily: "Sales", gridPos: { fileIndex: 1, row: 2, col: 2, totalRows: 5, totalCols: 5 } },
    { id: "ID-034", employeeId: "EMP-11014", name: "Xena War", jobTitle: "Ops Controller", avatarUrl: "input_file_1.png", jobFamily: "Operations", gridPos: { fileIndex: 1, row: 2, col: 3, totalRows: 5, totalCols: 5 } },
    { id: "ID-035", employeeId: "EMP-11015", name: "Yara Grey", jobTitle: "Cataloger", avatarUrl: "input_file_1.png", jobFamily: "Inventory", gridPos: { fileIndex: 1, row: 2, col: 4, totalRows: 5, totalCols: 5 } },
    { id: "ID-036", employeeId: "EMP-11016", name: "Zane Trues", jobTitle: "Standardization", avatarUrl: "input_file_1.png", jobFamily: "Compliance", gridPos: { fileIndex: 1, row: 3, col: 0, totalRows: 5, totalCols: 5 } },
    { id: "ID-037", employeeId: "EMP-11017", name: "Aloy Hunter", jobTitle: "Logic Technician", avatarUrl: "input_file_1.png", jobFamily: "AI", gridPos: { fileIndex: 1, row: 3, col: 1, totalRows: 5, totalCols: 5 } },
    { id: "ID-038", employeeId: "EMP-11018", name: "Bruce Wayne", jobTitle: "Facilities Mgr", avatarUrl: "input_file_1.png", jobFamily: "Admin", gridPos: { fileIndex: 1, row: 3, col: 2, totalRows: 5, totalCols: 5 } },
    { id: "ID-039", employeeId: "EMP-11019", name: "Clark Kent", jobTitle: "Monitor", avatarUrl: "input_file_1.png", jobFamily: "Security", gridPos: { fileIndex: 1, row: 3, col: 3, totalRows: 5, totalCols: 5 } },
    { id: "ID-040", employeeId: "EMP-11020", name: "Diana Prince", jobTitle: "Executive Aide", avatarUrl: "input_file_1.png", jobFamily: "Assistant", gridPos: { fileIndex: 1, row: 3, col: 4, totalRows: 5, totalCols: 5 } },
    { id: "ID-041", employeeId: "EMP-11021", name: "Ellen Ripley", jobTitle: "Logistics Lead", avatarUrl: "input_file_1.png", jobFamily: "Operations", gridPos: { fileIndex: 1, row: 4, col: 0, totalRows: 5, totalCols: 5 } },
    { id: "ID-042", employeeId: "EMP-11022", name: "Finn Mertens", jobTitle: "Field Support", avatarUrl: "input_file_1.png", jobFamily: "Operations", gridPos: { fileIndex: 1, row: 4, col: 1, totalRows: 5, totalCols: 5 } },
    { id: "ID-043", employeeId: "EMP-11023", name: "Goku Son", jobTitle: "Stock Lead", avatarUrl: "input_file_1.png", jobFamily: "Inventory", gridPos: { fileIndex: 1, row: 4, col: 2, totalRows: 5, totalCols: 5 } },
    { id: "ID-044", employeeId: "EMP-11024", name: "Hermione Granger", jobTitle: "Auditor", avatarUrl: "input_file_1.png", jobFamily: "Compliance", gridPos: { fileIndex: 1, row: 4, col: 3, totalRows: 5, totalCols: 5 } },
    { id: "ID-045", employeeId: "EMP-11025", name: "Ichigo Kurosaki", jobTitle: "Deep Learning", avatarUrl: "input_file_1.png", jobFamily: "AI", gridPos: { fileIndex: 1, row: 4, col: 4, totalRows: 5, totalCols: 5 } },
    
    // FILE 0: Borders (Remaining 5)
    { id: "ID-046", employeeId: "EMP-12001", name: "Joker Jack", jobTitle: "Events Admin", avatarUrl: "input_file_0.png", jobFamily: "Admin", gridPos: { fileIndex: 0, row: 0, col: 0, totalRows: 4, totalCols: 5 } },
    { id: "ID-047", employeeId: "EMP-12002", name: "Katniss Everdeen", jobTitle: "Perimeter Sec", avatarUrl: "input_file_0.png", jobFamily: "Security", gridPos: { fileIndex: 0, row: 0, col: 1, totalRows: 4, totalCols: 5 } },
    { id: "ID-048", employeeId: "EMP-12003", name: "Link Hero", jobTitle: "Support Aide", avatarUrl: "input_file_0.png", jobFamily: "Assistant", gridPos: { fileIndex: 0, row: 0, col: 2, totalRows: 4, totalCols: 5 } },
    { id: "ID-049", employeeId: "EMP-12004", name: "Mario Bros", jobTitle: "Sales Partner", avatarUrl: "input_file_0.png", jobFamily: "Sales", gridPos: { fileIndex: 0, row: 0, col: 3, totalRows: 4, totalCols: 5 } },
    { id: "ID-050", employeeId: "EMP-12005", name: "Naruto Uzumaki", jobTitle: "Delivery Specialist", avatarUrl: "input_file_0.png", jobFamily: "Operations", gridPos: { fileIndex: 0, row: 0, col: 4, totalRows: 4, totalCols: 5 } },
];

const VERIFIED_IDENTITIES: IdentityProfile[] = VERIFIED_IDENTITIES_BASE.map((identity, index) => ({
    ...identity,
    ...EMPLOYEE_FACE_ASSIGNMENTS[index % EMPLOYEE_FACE_ASSIGNMENTS.length]
}));

const JOB_FAMILY_SKILLS: Record<string, SkillBlock[]> = {
    "Sales": [
        { id: "SB-1", category: "Communication", items: [
            { id: "S-1", name: "Active Listening", selected: true },
            { id: "S-2", name: "Conflict Resolution", selected: false },
            { id: "S-3", name: "Multilingual Support", selected: false }
        ]},
        { id: "SB-2", category: "Technical Sales", items: [
            { id: "S-4", name: "Product Catalog Indexing", selected: true },
            { id: "S-5", name: "Upsell Logic", selected: false },
            { id: "S-20", name: "Sales Closing", selected: false }
        ]}
    ],
    "Operations": [
        { id: "SB-3", category: "Field Safety", items: [
            { id: "S-6", name: "OSHA Protocol Mapping", selected: true },
            { id: "S-7", name: "Emergency Dispatch", selected: false }
        ]},
        { id: "SB-4", category: "Coordination", items: [
            { id: "S-8", name: "Route Optimization", selected: true },
            { id: "S-9", name: "Fleet Monitoring", selected: false }
        ]}
    ],
    "Inventory": [
        { id: "SB-5", category: "Stock Management", items: [
            { id: "S-10", name: "Real-time Tracking", selected: true },
            { id: "S-11", name: "Supply Prediction", selected: false },
            { id: "S-21", name: "Procurement Logic", selected: false }
        ]}
    ],
    "Compliance": [
        { id: "SB-6", category: "Legal & Regulatory", items: [
            { id: "S-12", name: "Audit Trail Gen", selected: true },
            { id: "S-13", name: "Policy Enforcement", selected: true }
        ]}
    ],
    "AI": [
        { id: "SB-7", category: "Cognitive Processing", items: [
            { id: "S-14", name: "Neural Synthesis", selected: true },
            { id: "S-15", name: "Pattern Recognition", selected: true }
        ]}
    ],
    "Admin": [
        { id: "SB-8", category: "Executive Support", items: [
            { id: "S-16", name: "Calendar Optimization", selected: true },
            { id: "S-17", name: "Email Synthesis", selected: false }
        ]}
    ],
    "Security": [
        { id: "SB-9", category: "Protection", items: [
            { id: "S-18", name: "Threat Assessment", selected: true },
            { id: "S-19", name: "Access Control", selected: true }
        ]}
    ],
    "Assistant": [
        { id: "SB-10", category: "General Support", items: [
            { id: "S-22", name: "Task Management", selected: true },
            { id: "S-23", name: "Information Retrieval", selected: true }
        ]}
    ]
};

const ENVIRONMENT_SKILLS: Record<string, SkillBlock[]> = {
    "Remote / Virtual": [
        { id: "SB-ENV-1", category: "Digital Workplace", items: [
            { id: "S-E1", name: "Async Communication", selected: true },
            { id: "S-E2", name: "Screenshare Oversight", selected: false }
        ]}
    ],
    "On-site / Physical": [
        { id: "SB-ENV-2", category: "Field Interaction", items: [
            { id: "S-E3", name: "Geo-fencing Logic", selected: true },
            { id: "S-E4", name: "Offline Sync", selected: false }
        ]}
    ],
    "Hybrid": [
        { id: "SB-ENV-3", category: "Seamless Transition", items: [
            { id: "S-E5", name: "Context Preservation", selected: true },
            { id: "S-E6", name: "Channel Routing", selected: true }
        ]}
    ]
};

const JOB_FAMILY_MAP: Record<string, JobFamily> = {
    "Pet Retail": "Sales",
    "Food Service": "Inventory",
    "Construction": "Operations",
    "Healthcare": "Operations",
    "Logistics": "Inventory",
    "Customer Support": "Sales",
    "Hospitality": "Sales",
    "Education": "Assistant",
    "Quality Control": "Compliance",
    "Security": "Security",
    "Data Analysis": "AI",
    "Administrative": "Admin",
    "HR & Legal": "Admin",
    "Finance": "Admin",
    "Energy & Utility": "Operations",
    "Manufacturing": "Operations"
};

const JOB_SUGGESTIONS: Record<string, string[]> = {
    "birds": ["Pet Sales Associate", "Bird Sales Specialist", "Avian Care Consultant"],
    "kitchen": ["Kitchen Manager", "Food Safety Assistant", "Prep Cook Assistant"],
    "construction": ["Field Supervisor", "Site Safety Assistant", "Estimator"],
    "support": ["Customer Success Agent", "Technical Specialist", "Help Desk Coordinator"],
    "security": ["Safety Monitor", "Protocol Enforcement Unit", "Digital Sentinel"]
};

export default function EmploymentCenter() {
    const [view, setView] = useState<'dashboard' | 'builder' | 'deployed' | 'certification' | 'admin'>('admin');
    const [step, setStep] = useState(1);
    const [intake, setIntake] = useState<IntakeForm>({
        jobTitle: '',
        industry: '',
        jobFamily: 'Assistant',
        environment: 'Remote / Virtual',
        responsibilities: [],
        skillBlocks: [],
        capabilities: { voice: true, chat: true, vision: false, iot: false, documents: true },
        boundaries: { neverDo: [], escalateOn: [] }
    });
    const [suggestionQuery, setSuggestionQuery] = useState('');
    const [activeVM, setActiveVM] = useState<EmployeeVM | null>(null);
    const [rolodexIndex, setRolodexIndex] = useState(0);
    const [recentEmployeeId, setRecentEmployeeId] = useState<string | null>(null);
    const deployedEmployees = useWorkforceStore(state => state.employees);
    const onboardEmployee = useWorkforceStore(state => state.onboardEmployee);

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);

    const [isProvisioning, setIsProvisioning] = useState(false);
    const [certProgress, setCertProgress] = useState(0);
    const [certChecks, setCertChecks] = useState<any>({
        grounding: 'pending',
        tools: 'pending',
        policy: 'pending',
        simulation: 'pending'
    });
    const recentEmployee = (recentEmployeeId ? deployedEmployees.find(emp => emp.employeeId === recentEmployeeId) : undefined) || deployedEmployees[0];

    const runCertification = async () => {
        setView('certification');
        setCertProgress(0);
        
        const steps = [
            { key: 'grounding', label: 'Grounding Role Context', duration: 1200 },
            { key: 'tools', label: 'Checking Tool Capability', duration: 1500 },
            { key: 'policy', label: 'Compiling Contract Policy', duration: 1000 },
            { key: 'simulation', label: 'Running Unit Simulation', duration: 3000 }
        ];

        for (const s of steps) {
            setCertChecks((prev: any) => ({ ...prev, [s.key]: 'running' }));
            await new Promise(r => setTimeout(r, s.duration));
            setCertChecks((prev: any) => ({ ...prev, [s.key]: 'passed' }));
            setCertProgress(prev => prev + 25);
        }

        deployEmployee();
    };

    const deployEmployee = () => {
        setIsProvisioning(true);
        const family = intake.selectedIdentity?.jobFamily || JOB_FAMILY_MAP[intake.industry] || 'Assistant';
        
        // Simulate dramatic provisioning
        setTimeout(() => {
            const empId = intake.selectedIdentity?.employeeId || generateId('EMP');
            const permissions = Object.entries(intake.capabilities).filter(([_, v]) => v).map(([k]) => k);
            const tools = Object.entries(intake.capabilities).filter(([_, v]) => v).map(([k]) => `core.${k}`);
            const newEmployee: EmployeeVM = createGovernedEmployee({
                employeeId: empId,
                employerId: 'LEEWAY-CENTER',
                employerName: 'Leeway Employment Center',
                humanOwner: 'Leeway Administrator',
                humanEmail: 'admin@leeway.example',
                deviceId: 'DEVICE-LEEWAY-ADMIN',
                deviceLabel: 'Leeway Employment Admin Console',
                jobTitle: intake.jobTitle,
                industry: intake.industry,
                department: intake.selectedIdentity?.jobTitle || 'Operations',
                displayName: intake.selectedIdentity?.name || intake.jobTitle,
                jobFamily: family,
                duties: intake.skillBlocks.flatMap(b => b.items.filter(i => i.selected).map(i => i.name)),
                boundaries: intake.boundaries.neverDo.filter(l => l.trim()),
                kpis: ["Response accuracy", "Task completion rate", "Governance pass-through"],
                permissions,
                tools,
                knowledgeRefs: ["knowledge_base.pdf", "role_laws.json", "privacy-guard-policy.md"],
                avatarUrl: intake.selectedIdentity?.avatarUrl,
                gridPos: intake.selectedIdentity?.gridPos,
                status: 'pending',
                contractStatus: 'pending',
                sessionStatus: 'staged',
                paymentStatus: 'authorized',
                hoursWorked: 1,
                adminNotes: ['Drafted from the Employment Center builder and awaiting Admin + Governance certification.'],
            });
            onboardEmployee(newEmployee);
            setRecentEmployeeId(newEmployee.employeeId);
            setIsProvisioning(false);
            setView('deployed');
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-[#FBFBF9] text-[#1A1A1A] font-sans flex overflow-hidden select-none">
            {/* Left Sidebar: Process Navigation */}
            <aside className="w-[240px] border-r border-[#1A1A1A]/10 flex flex-col p-8 shrink-0">
                <div className="mb-16">
                    <h1 className="text-xs font-bold tracking-[0.2em] uppercase text-[#1A1A1A]/40 mb-2">System</h1>
                    <div className="text-2xl font-serif italic tracking-tighter">Leeway</div>
                </div>
                
                <nav className="space-y-8">
                    <button 
                        onClick={() => setView('dashboard')}
                        className={cn(
                            "group block text-left transition-all",
                            view === 'dashboard' ? "opacity-100" : "opacity-30 hover:opacity-100"
                        )}
                    >
                        <span className="text-[10px] block mb-1 uppercase tracking-widest font-bold">Overview</span>
                        <span className={cn("text-sm transition-all", view === 'dashboard' && "font-medium border-b-2 border-[#1A1A1A]")}>Workforce</span>
                    </button>

                    <button 
                        onClick={() => setView('admin')}
                        className={cn(
                            "group block text-left transition-all",
                            view === 'admin' ? "opacity-100" : "opacity-30 hover:opacity-100"
                        )}
                    >
                        <span className="text-[10px] block mb-1 uppercase tracking-widest font-bold">Administrative Control</span>
                        <span className={cn("text-sm transition-all", view === 'admin' && "font-medium border-b-2 border-[#1A1A1A]")}>Admin Console</span>
                    </button>

                    <div className={cn("space-y-6 transition-all", view !== 'builder' && "opacity-30 pointer-events-none")}>
                        <div className="h-px bg-black/5 my-4" />
                        {[
                            { s: 1, l: "Position Details" },
                            { s: 2, l: "Select Identity" },
                            { s: 3, l: "Skill Engineering" },
                            { s: 4, l: "Governance" },
                            { s: 5, l: "Deployment" }
                        ].map(({ s, l }) => (
                            <div key={s} className={cn("group cursor-default", view === 'builder' && step === s ? "opacity-100" : "opacity-30")}>
                                <span className="text-[10px] block mb-1 uppercase tracking-widest font-bold">Step 0{s}</span>
                                <span className={cn("text-sm transition-all", view === 'builder' && step === s && "font-medium border-b-2 border-[#1A1A1A]")}>{l}</span>
                            </div>
                        ))}
                    </div>
                </nav>

                <div className="mt-auto space-y-2">
                    <div className="text-[10px] uppercase font-bold tracking-widest opacity-40">
                        Construct v2.4.0
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        <span className="text-[9px] uppercase font-bold tracking-tighter opacity-40">Orchestrator Ready</span>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                <div className="p-16 flex flex-col min-h-full w-full max-w-[1600px]">
                    <AnimatePresence mode="wait">
                        {view === 'admin' && (
                            <motion.div 
                                key="admin"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -16 }}
                                className="space-y-12"
                            >
                                <AdminConsole onOpenVM={(employee) => setActiveVM(employee)} onOpenBuilder={() => setView('builder')} />
                            </motion.div>
                        )}

                        {view === 'dashboard' && (
                            <motion.div 
                                key="dashboard"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-12"
                            >
                                <header className="mb-12">
                                    <h2 className="text-6xl font-serif italic leading-tight tracking-tighter mb-4">Your digital <br/>workforce.</h2>
                                    <p className="text-sm text-[#1A1A1A]/60 max-w-md uppercase tracking-wide leading-relaxed">Manage governed digital professionals across your organization.</p>
                                </header>

                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => setView('builder')}
                                        className="px-10 py-4 bg-[#1A1A1A] text-white text-xs uppercase font-bold tracking-widest hover:opacity-90 transition-all flex items-center gap-4"
                                    >
                                        Establish New Unit
                                        <Plus size={14} />
                                    </button>
                                    <button 
                                        onClick={() => setView('admin')}
                                        className="px-10 py-4 border border-[#1A1A1A] text-[#1A1A1A] text-xs uppercase font-bold tracking-widest hover:bg-white transition-all flex items-center gap-4"
                                    >
                                        Open Admin Console
                                        <Shield size={14} />
                                    </button>
                                </div>

                                {deployedEmployees.length === 0 ? (
                                    <div className="h-[300px] border border-black/5 bg-white/50 rounded-sm flex flex-col items-center justify-center gap-4 text-center p-12">
                                        <div className="w-12 h-px bg-black/10" />
                                        <p className="text-[10px] text-[#1A1A1A]/40 uppercase tracking-[0.2em] font-bold">No active units deployed.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                                        {deployedEmployees.map(emp => (
                                            <EmployeeRow key={emp.employeeId} emp={emp} onOpenVM={() => setActiveVM(emp)} />
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {view === 'builder' && (
                            <motion.div 
                                key="builder"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-12"
                            >
                                {step === 1 && (
                                    <div className="space-y-12">
                                        <header>
                                            <h2 className="text-6xl font-serif italic leading-tight tracking-tighter mb-4">What kind of employee <br/>do you need?</h2>
                                            <p className="text-sm text-[#1A1A1A]/60 max-w-md uppercase tracking-wide leading-relaxed">Define the identity and specific industrial context of the digital professional.</p>
                                        </header>
                                        
                                        <div className="space-y-12">
                                            <div className="max-w-lg relative group">
                                                <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-3">Desired Job Title</label>
                                                <input 
                                                    value={intake.jobTitle}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setIntake({...intake, jobTitle: val});
                                                        setSuggestionQuery(val.toLowerCase());
                                                    }}
                                                    placeholder="e.g. Sales Specialist"
                                                    className="w-full bg-transparent border-b border-[#1A1A1A] py-2 text-2xl font-serif outline-none placeholder:opacity-20"
                                                />
                                                {suggestionQuery.length > 2 && JOB_SUGGESTIONS[suggestionQuery] && (
                                                    <div className="absolute left-0 top-full mt-4 bg-white shadow-2xl border border-black/5 p-4 w-full z-10 transition-all">
                                                        <p className="text-[9px] uppercase font-bold opacity-30 mb-2">Verified Frameworks</p>
                                                        <div className="space-y-1">
                                                            {JOB_SUGGESTIONS[suggestionQuery].map(s => (
                                                                <button 
                                                                    key={s} 
                                                                    onClick={() => {
                                                                        setIntake({...intake, jobTitle: s});
                                                                        setSuggestionQuery('');
                                                                    }}
                                                                    className="w-full text-left text-sm p-2 hover:bg-[#FBFBF9] border-b border-black/5 last:border-0 cursor-pointer flex justify-between group/suggest"
                                                                >
                                                                    <span>{s}</span>
                                                                    <span className="opacity-0 group-hover/suggest:opacity-30 text-[10px] transition-opacity">Select</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-12 max-w-2xl">
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-2">Industry</label>
                                                    <select 
                                                        value={intake.industry}
                                                        onChange={e => {
                                                            const ind = e.target.value;
                                                            const family = JOB_FAMILY_MAP[ind] || 'Assistant';
                                                            const familySkills = JOB_FAMILY_SKILLS[family] || [];
                                                            const envSkills = ENVIRONMENT_SKILLS[intake.environment] || [];
                                                            
                                                            setIntake({
                                                                ...intake, 
                                                                industry: ind,
                                                                jobFamily: family,
                                                                skillBlocks: JSON.parse(JSON.stringify([...familySkills, ...envSkills]))
                                                            });
                                                        }}
                                                        className="w-full bg-transparent border-b border-black/20 py-2 text-sm appearance-none outline-none focus:border-black transition-all"
                                                    >
                                                        <option value="">Select Vertical</option>
                                                        {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block mb-2">Workplace Type</label>
                                                    <select 
                                                        value={intake.environment}
                                                        onChange={e => {
                                                            const env = e.target.value;
                                                            const familySkills = JOB_FAMILY_SKILLS[intake.jobFamily] || [];
                                                            const envSkills = ENVIRONMENT_SKILLS[env] || [];
                                                            
                                                            setIntake({
                                                                ...intake, 
                                                                environment: env,
                                                                skillBlocks: JSON.parse(JSON.stringify([...familySkills, ...envSkills]))
                                                            });
                                                        }}
                                                        className="w-full bg-transparent border-b border-black/20 py-2 text-sm appearance-none outline-none focus:border-black transition-all"
                                                    >
                                                        {ENVIRONMENTS.map(env => <option key={env} value={env}>{env}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <footer className="pt-12 flex justify-between items-center bg-[#FBFBF9]/80 backdrop-blur sticky bottom-0">
                                            <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Step 01 of 05</div>
                                            <button 
                                                onClick={handleNext}
                                                disabled={!intake.jobTitle || !intake.industry}
                                                className="px-12 py-4 bg-[#1A1A1A] text-white text-xs uppercase font-bold tracking-widest hover:opacity-90 disabled:opacity-20 transition-all shadow-xl active:scale-95"
                                            >
                                                Next: Select Identity
                                            </button>
                                        </footer>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="space-y-12 h-full flex flex-col">
                                        <header>
                                            <h2 className="text-6xl font-serif italic leading-tight tracking-tighter mb-4">Select Identity <br/>Rolodex.</h2>
                                            <p className="text-sm text-[#1A1A1A]/60 max-w-md uppercase tracking-wide leading-relaxed">Choose from our pre-certified pool of digital professional identities. Each unit is calibrated with specific base traits.</p>
                                        </header>

                                        <div className="flex-grow flex flex-col items-center justify-center min-h-0 bg-white border border-black/5 p-12 space-y-12">
                                            <div className="w-full max-w-2xl flex flex-col items-center">
                                                <div className="flex justify-between items-center w-full mb-8">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Identity Selection Rolodex</p>
                                                    <div className="text-[10px] font-mono opacity-40">RECORD {rolodexIndex + 1} OF {VERIFIED_IDENTITIES.length}</div>
                                                </div>

                                                <div className="relative flex items-center justify-center w-full py-20 px-8 bg-zinc-50/50 rounded-3xl border border-black/5 overflow-hidden">
                                                    <div className="flex items-center justify-center w-full h-[450px] relative">
                                                        <AnimatePresence initial={false}>
                                                            {/* We show 7 cards for a smooth wrap-around feel */}
                                                            {[-3, -2, -1, 0, 1, 2, 3].map((offset) => {
                                                                const index = (rolodexIndex + offset + VERIFIED_IDENTITIES.length) % VERIFIED_IDENTITIES.length;
                                                                const id = VERIFIED_IDENTITIES[index];
                                                                const isCenter = offset === 0;
                                                                const isSelected = intake.selectedIdentity?.id === id.id;
                                                                const absOffset = Math.abs(offset);

                                                                return (
                                                                    <motion.div
                                                                        key={id.id}
                                                                        initial={{ opacity: 0, scale: 0.5, x: offset * 120 }}
                                                                        animate={{ 
                                                                            opacity: 1 - (absOffset * 0.25), 
                                                                            scale: isCenter ? 1.5 : 1 - (absOffset * 0.15),
                                                                            x: offset * 180,
                                                                            rotateY: offset * -20,
                                                                            z: -absOffset * 150,
                                                                            zIndex: 50 - absOffset,
                                                                        }}
                                                                        exit={{ opacity: 0, scale: 0.5, x: offset * 120 }}
                                                                        transition={{ 
                                                                            type: "spring", 
                                                                            stiffness: 400, 
                                                                            damping: 40,
                                                                            mass: 0.8
                                                                        }}
                                                                        className={cn(
                                                                            "absolute flex flex-col items-center select-none",
                                                                            !isCenter && "cursor-pointer hover:brightness-110",
                                                                            isCenter ? "brightness-100" : "brightness-75 grayscale-50"
                                                                        )}
                                                                        style={{ perspective: '1200px' }}
                                                                        onClick={() => {
                                                                            setRolodexIndex(index);
                                                                            setIntake({ ...intake, selectedIdentity: id, jobTitle: id.jobTitle });
                                                                        }}
                                                                    >
                                                                        <div className={cn(
                                                                            "w-48 h-48 rounded-full overflow-hidden border-8 transition-all duration-700 bg-white",
                                                                            isCenter ? "border-black shadow-[0_40px_80px_-15px_rgba(0,0,0,0.4),0_20px_40px_-20px_rgba(0,0,0,0.3)] ring-8 ring-black/5" : "border-black/5"
                                                                        )}>
                                                                            <VoxelAvatar profile={id} />
                                                                        </div>
                                                                        
                                                                        {isCenter && (
                                                                            <motion.div 
                                                                                initial={{ opacity: 0, y: 10 }}
                                                                                animate={{ opacity: 1, y: 0 }}
                                                                                className="mt-16 text-center w-full"
                                                                            >
                                                                                <div className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 mb-2">Unit Identity Locked</div>
                                                                                <h3 className="text-4xl font-serif italic tracking-tighter mb-4 whitespace-nowrap">{id.name}</h3>
                                                                                <div className="flex flex-col items-center gap-4">
                                                                                    {isSelected && (
                                                                                        <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 px-4 py-1.5 rounded-full border border-green-100">
                                                                                            <CheckCircle2 size={14} className="fill-green-600 text-white" />
                                                                                            <span className="text-[10px] font-black uppercase tracking-widest">Active Connection</span>
                                                                                        </div>
                                                                                    )}
                                                                                    <div className="text-[9px] font-mono opacity-40 uppercase tracking-widest">{id.jobTitle}</div>
                                                                                </div>
                                                                            </motion.div>
                                                                        )}
                                                                    </motion.div>
                                                                );
                                                            })}
                                                        </AnimatePresence>
                                                    </div>

                                                    {/* Scroll Bar / Scrub Control */}
                                                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-64 h-12 flex items-center justify-between px-4 bg-white rounded-full shadow-lg border border-black/5">
                                                        <button 
                                                            onClick={() => setRolodexIndex((prev) => (prev - 1 + VERIFIED_IDENTITIES.length) % VERIFIED_IDENTITIES.length)}
                                                            className="p-2 hover:bg-black/5 rounded-full transition-colors active:scale-90"
                                                        >
                                                            <ChevronLeft size={16} />
                                                        </button>
                                                        
                                                        {/* Visual scrubbing area */}
                                                        <div className="flex-grow flex justify-center gap-1.5 px-4">
                                                            {VERIFIED_IDENTITIES.map((_, i) => (
                                                                <div 
                                                                    key={i} 
                                                                    className={cn(
                                                                        "h-1 rounded-full transition-all duration-300",
                                                                        rolodexIndex === i ? "w-6 bg-black" : "w-1.5 bg-black/10"
                                                                    )} 
                                                                />
                                                            ))}
                                                        </div>

                                                        <button 
                                                            onClick={() => setRolodexIndex((prev) => (prev + 1) % VERIFIED_IDENTITIES.length)}
                                                            className="p-2 hover:bg-black/5 rounded-full transition-colors active:scale-90"
                                                        >
                                                            <ChevronRight size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <footer className="pt-12 flex justify-between items-center bg-[#FBFBF9]/80 backdrop-blur sticky bottom-0">
                                            <button onClick={handleBack} className="text-[10px] uppercase font-bold tracking-widest opacity-40 hover:opacity-100 transition-opacity">Return</button>
                                            <button 
                                                onClick={handleNext}
                                                disabled={!intake.selectedIdentity}
                                                className="px-12 py-4 bg-[#1A1A1A] text-white text-xs uppercase font-bold tracking-widest hover:opacity-90 disabled:opacity-20 transition-all shadow-xl active:scale-95"
                                            >
                                                Next: Skill Engineering
                                            </button>
                                        </footer>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="space-y-12">
                                        <header>
                                            <h2 className="text-6xl font-serif italic leading-tight tracking-tighter mb-4">Skill <br/>Engineering.</h2>
                                            <p className="text-sm text-[#1A1A1A]/60 max-w-md uppercase tracking-wide leading-relaxed">Customize the cognitive capability blocks for this unit.</p>
                                        </header>

                                        <div className="space-y-12">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                {intake.skillBlocks.map((block, bIdx) => (
                                                    <div key={block.id} className="p-8 border border-black/10 bg-white/50 space-y-6">
                                                        <div className="flex justify-between items-center border-b border-black/5 pb-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-2 h-2 bg-black rounded-full" />
                                                                <h3 className="text-xs font-black uppercase tracking-[0.2em]">{block.category}</h3>
                                                            </div>
                                                            <button 
                                                                onClick={() => {
                                                                    const newBlocks = [...intake.skillBlocks];
                                                                    const allSelected = newBlocks[bIdx].items.every(i => i.selected);
                                                                    newBlocks[bIdx].items.forEach(i => i.selected = !allSelected);
                                                                    setIntake({ ...intake, skillBlocks: newBlocks });
                                                                }}
                                                                className="text-[9px] font-bold uppercase opacity-30 hover:opacity-100 transition-opacity"
                                                            >
                                                                {block.items.every(i => i.selected) ? "Deselect Block" : "Select Entire Block"}
                                                            </button>
                                                        </div>
                                                        <div className="space-y-3">
                                                            {block.items.map((item, iIdx) => (
                                                                <button
                                                                    key={item.id}
                                                                    onClick={() => {
                                                                        const newBlocks = [...intake.skillBlocks];
                                                                        newBlocks[bIdx].items[iIdx].selected = !newBlocks[bIdx].items[iIdx].selected;
                                                                        setIntake({ ...intake, skillBlocks: newBlocks });
                                                                    }}
                                                                    className={cn(
                                                                        "w-full flex items-center justify-between p-3 border transition-all text-[10px] font-bold uppercase tracking-widest",
                                                                        item.selected ? "bg-black text-white border-black" : "bg-white border-black/5 text-zinc-400 hover:border-black/20"
                                                                    )}
                                                                >
                                                                    <span>{item.name}</span>
                                                                    {item.selected && <CheckCircle2 size={12} />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Skill Marketplace / Add Block */}
                                                <div className="p-8 border border-dashed border-black/20 space-y-4">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <Plus size={16} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Connect Marketplace Skill</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {Object.keys(JOB_FAMILY_SKILLS).map(family => (
                                                            <button 
                                                                key={family}
                                                                onClick={() => {
                                                                    const blocksToAdd = JOB_FAMILY_SKILLS[family].filter(b => !intake.skillBlocks.some(eb => eb.id === b.id));
                                                                    if (blocksToAdd.length) {
                                                                        setIntake({
                                                                            ...intake,
                                                                            skillBlocks: [...intake.skillBlocks, ...JSON.parse(JSON.stringify(blocksToAdd))]
                                                                        });
                                                                    }
                                                                }}
                                                                className="text-[8px] font-bold uppercase border border-black/5 p-2 hover:bg-black hover:text-white transition-all text-center"
                                                            >
                                                                {family} Logic
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <footer className="pt-12 flex justify-between items-center bg-[#FBFBF9]/80 backdrop-blur sticky bottom-0">
                                            <button onClick={handleBack} className="text-[10px] uppercase font-bold tracking-widest opacity-40 hover:opacity-100 transition-opacity">Return</button>
                                            <button 
                                                onClick={handleNext}
                                                className="px-12 py-4 bg-[#1A1A1A] text-white text-xs uppercase font-bold tracking-widest hover:opacity-90 transition-all shadow-xl active:scale-95"
                                            >
                                                Finalize Scope
                                            </button>
                                        </footer>
                                    </div>
                                )}

                                {step === 4 && (
                                    <div className="space-y-12">
                                        <header>
                                            <h2 className="text-6xl font-serif italic leading-tight tracking-tighter mb-4">Boundaries & <br/>Governance.</h2>
                                            <p className="text-sm text-[#1A1A1A]/60 max-w-md uppercase tracking-wide leading-relaxed">Hard-code the legal and ethical limits of the digital employee.</p>
                                        </header>

                                        <div className="space-y-12 max-w-2xl">
                                            <div className="space-y-8">
                                                <div className="relative">
                                                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-30 block mb-3">Negative Constraints (Never-Do)</label>
                                                    <textarea 
                                                        placeholder="Establish absolute prohibitions..."
                                                        className="w-full bg-transparent border-b border-[#1A1A1A]/20 py-2 text-sm outline-none placeholder:opacity-20 h-24 focus:border-[#1A1A1A] transition-all"
                                                        value={intake.boundaries.neverDo.join('\n')}
                                                        onChange={e => setIntake({...intake, boundaries: {...intake.boundaries, neverDo: e.target.value.split('\n')}})}
                                                    />
                                                </div>

                                                <div className="relative">
                                                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-30 block mb-3">Escalation Thresholds</label>
                                                    <textarea 
                                                        placeholder="When should a human intervene?"
                                                        className="w-full bg-transparent border-b border-[#1A1A1A]/20 py-2 text-sm outline-none placeholder:opacity-20 h-24 focus:border-[#1A1A1A] transition-all"
                                                        value={intake.boundaries.escalateOn.join('\n')}
                                                        onChange={e => setIntake({...intake, boundaries: {...intake.boundaries, escalateOn: e.target.value.split('\n')}})}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <footer className="pt-12 flex justify-between items-center bg-[#FBFBF9]/80 backdrop-blur sticky bottom-0">
                                            <button onClick={handleBack} className="text-[10px] uppercase font-bold tracking-widest opacity-40 hover:opacity-100 transition-opacity">Return</button>
                                            <button 
                                                onClick={handleNext}
                                                className="px-12 py-4 bg-[#1A1A1A] text-white text-xs uppercase font-bold tracking-widest hover:opacity-90 transition-all shadow-xl active:scale-95"
                                            >
                                                Lock Protocol
                                            </button>
                                        </footer>
                                    </div>
                                )}

                                {step === 5 && (
                                    <div className="space-y-12">
                                         <header>
                                            <h2 className="text-6xl font-serif italic leading-tight tracking-tighter mb-4">Deployment <br/>Verification.</h2>
                                            <p className="text-sm text-[#1A1A1A]/60 max-w-md uppercase tracking-wide leading-relaxed">Review the generated unit manifest before initializing the VM.</p>
                                        </header>

                                        <div className="flex flex-col xl:flex-row gap-12 items-start opacity-70 grayscale-0 hover:grayscale-0 transition-all duration-700">
                                            <EmployeeCard vm={{ 
                                                jobTitle: intake.jobTitle, 
                                                employerId: 'LEEWAY CENTER', 
                                                employeeId: intake.selectedIdentity?.employeeId || 'PENDING', 
                                                displayName: intake.selectedIdentity?.name || 'New Unit',
                                                avatarUrl: intake.selectedIdentity?.avatarUrl || 'https://avatar.vercel.sh/leeway',
                                                token: '', 
                                                status: 'active',
                                                identity: {
                                                    jobFamily: intake.selectedIdentity?.jobFamily || intake.jobFamily,
                                                    borderColor: JOB_FAMILY_COLORS[intake.selectedIdentity?.jobFamily || intake.jobFamily].hex,
                                                    badgeColor: (intake.selectedIdentity?.jobFamily || intake.jobFamily).toLowerCase(),
                                                    statusColor: 'green',
                                                    avatarId: intake.selectedIdentity?.id || 'AV-PENDING',
                                                    authorityLevel: 'standard',
                                                    isCertified: true,
                                                    gridPos: intake.selectedIdentity?.gridPos
                                                }
                                            } as any} />
                                            <ContractCard vm={{ 
                                                jobTitle: intake.jobTitle, 
                                                contract: { 
                                                    duties: intake.skillBlocks.flatMap(b => b.items.filter(i => i.selected).map(i => i.name)), 
                                                    boundaries: intake.boundaries.neverDo.filter(l => l.trim()) 
                                                } 
                                            } as any} />
                                        </div>

                                        <footer className="pt-12 flex justify-between items-center bg-[#FBFBF9]/80 backdrop-blur sticky bottom-0">
                                            <button onClick={handleBack} className="text-[10px] uppercase font-bold tracking-widest opacity-40 hover:opacity-100 transition-opacity">Return</button>
                                            <button 
                                                onClick={runCertification}
                                                className="px-12 py-6 bg-[#1A1A1A] text-white text-sm uppercase font-bold tracking-[0.2em] hover:opacity-90 transition-all shadow-2xl active:scale-95"
                                            >
                                                Begin Certification Sequence
                                            </button>
                                        </footer>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {view === 'certification' && (
                            <motion.div 
                                key="certification"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex-1 flex flex-col items-center justify-center space-y-16 py-12"
                            >
                                <div className="text-center space-y-4">
                                     <div className="text-[10px] font-black tracking-[0.4em] uppercase text-zinc-400 mb-2">Readiness Protocol 7.2</div>
                                     <h2 className="text-6xl font-serif italic tracking-tighter">Unit Certification</h2>
                                     <p className="text-sm text-zinc-500 max-w-sm mx-auto">The Leeway Orchestrator is verifying the digital professional against your corporate benchmarks.</p>
                                </div>

                                <div className="w-full max-w-xl space-y-12">
                                     {/* Progress Bar */}
                                     <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest opacity-40">
                                            <span>Scanning Capabilities</span>
                                            <span>{certProgress}%</span>
                                        </div>
                                        <div className="w-full h-[1px] bg-black/5 relative overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${certProgress}%` }}
                                                className="absolute inset-y-0 bg-black transition-all duration-500"
                                            />
                                        </div>
                                     </div>

                                     {/* Checklist */}
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                         {[
                                             { key: 'grounding', label: 'Role Grounding', icon: <Search size={14} /> },
                                             { key: 'tools', label: 'Tool Connectivity', icon: <Zap size={14} /> },
                                             { key: 'policy', label: 'Contract Policy', icon: <Shield size={14} /> },
                                             { key: 'simulation', label: 'Unit Simulation', icon: <Play size={14} /> }
                                         ].map(c => (
                                             <div key={c.key} className="flex gap-4 items-start">
                                                 <div className={cn(
                                                     "w-10 h-10 flex items-center justify-center rounded border transition-all",
                                                     certChecks[c.key] === 'passed' ? "bg-black text-white border-black" : "bg-white border-black/5 text-zinc-300"
                                                 )}>
                                                     {certChecks[c.key] === 'passed' ? <CheckCircle2 size={16} /> : c.icon}
                                                 </div>
                                                 <div className="space-y-1">
                                                     <p className="text-[10px] font-black uppercase tracking-widest leading-none">{c.label}</p>
                                                     <p className="text-[8px] opacity-40 uppercase font-bold">
                                                         {certChecks[c.key] === 'pending' && "Awaiting Check..."}
                                                         {certChecks[c.key] === 'running' && "Initialising..."}
                                                         {certChecks[c.key] === 'passed' && "Verification Successful"}
                                                     </p>
                                                 </div>
                                             </div>
                                         ))}
                                     </div>

                                     {/* Simulation Room Monitor */}
                                     <div className="p-8 bg-white border border-black/5 shadow-sm rounded-sm font-mono text-[9px] text-zinc-500 space-y-2">
                                         <div className="flex gap-2">
                                             <span className="text-black">SIM_INIT:</span>
                                             <span>[{intake.jobTitle.toUpperCase()}] STABLE</span>
                                         </div>
                                         <div className="flex gap-2">
                                             <span className="text-black">GOV_CHECK:</span>
                                             <span>LAW_ENGINE_ACTIVE</span>
                                         </div>
                                         <div className="flex gap-2">
                                             <span className="text-black">SCENARIO:</span>
                                             <span>{certChecks.simulation === 'passed' ? "SCENARIO_PASSED_AUTH_0" : "RUNNING_SCENARIO_1..."}</span>
                                         </div>
                                     </div>
                                </div>
                            </motion.div>
                        )}

                        {view === 'deployed' && (
                            <motion.div 
                                key="deployed"
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col space-y-12 py-12"
                            >
                                <header>
                                    <h2 className="text-7xl font-serif italic leading-tight tracking-tighter mb-4 text-[#1A1A1A]">Contract routed.</h2>
                                    <p className="text-sm text-[#1A1A1A]/60 max-w-md uppercase tracking-wide leading-relaxed">The digital professional has been staged inside the governed admin pipeline and is awaiting Admin + Governance certification.</p>
                                </header>

                                <div className="flex flex-col lg:flex-row gap-16 items-start">
                                    {recentEmployee && <EmployeeCard className="shadow-2xl scale-110 origin-top-left" vm={recentEmployee} />}
                                    <div className="max-w-sm space-y-12">
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Admin Routing Summary</h3>
                                                <p className="text-xs text-zinc-500 leading-relaxed italic">
                                                    Authentication has been staged, billing is set to $1 per hour, and the contract is waiting for approval inside the Leeway Employment Admin Console.
                                                </p>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/40">Security Token</label>
                                                <div className="bg-white border border-black/5 p-4 font-mono text-[10px] text-[#1A1A1A] break-all shadow-sm">
                                                    {recentEmployee?.token}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <button 
                                                onClick={() => setView('admin')}
                                                className="flex-1 py-4 bg-[#1A1A1A] text-white text-xs uppercase font-bold tracking-widest hover:opacity-90 flex items-center justify-center gap-3"
                                            >
                                                <Terminal size={14} />
                                                Open Admin Portal
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    // Mock download logic
                                                    alert("Certification Bundle Generated: \n- EMPLOYMENT_ADMIN_CONSOLE_SPEC.md\n- PRIVACY_GUARD_POLICY.md\n- ADMIN_AUDIT_REPORT.md\n- EMPLOYER_DATA_ISOLATION_REPORT.md");
                                                }}
                                                className="flex-1 py-4 border border-[#1A1A1A] text-[#1A1A1A] text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                                            >
                                                <FileText size={14} />
                                                Download Admin Pack
                                            </button>
                                            <button 
                                                onClick={() => setView('dashboard')}
                                                className="flex-1 py-4 text-[#1A1A1A]/40 text-[10px] font-bold uppercase tracking-widest hover:text-[#1A1A1A]"
                                            >
                                                Dashboard
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* Right Sidebar: Live Preview (Conditional for builder) */}
            <AnimatePresence>
                {view === 'builder' && (
                    <motion.aside 
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        className="w-[380px] bg-[#F2F1ED] p-8 flex flex-col border-l border-black/5 shrink-0 overflow-y-auto"
                    >
                        <div className="text-[10px] font-bold uppercase tracking-widest opacity-30 mb-12 text-center">Live Unit Mapping</div>
                        <div className="flex flex-col items-center gap-8">
                            <EmployeeCard 
                                className="scale-90" 
                                vm={{ 
                                    jobTitle: intake.jobTitle || 'New Role', 
                                    employerId: 'LEEWAY CENTER', 
                                    employeeId: intake.selectedIdentity?.employeeId || 'ID-PENDING', 
                                    displayName: intake.selectedIdentity?.name || 'New Unit',
                                    avatarUrl: intake.selectedIdentity?.avatarUrl || 'https://avatar.vercel.sh/leeway',
                                    token: '', 
                                    status: 'active',
                                    identity: {
                                        jobFamily: intake.selectedIdentity?.jobFamily || intake.jobFamily,
                                        borderColor: JOB_FAMILY_COLORS[intake.selectedIdentity?.jobFamily || intake.jobFamily].hex,
                                        badgeColor: (intake.selectedIdentity?.jobFamily || intake.jobFamily).toLowerCase(),
                                        statusColor: 'green',
                                        avatarId: intake.selectedIdentity?.id || 'AV-001',
                                        authorityLevel: 'standard',
                                        gridPos: intake.selectedIdentity?.gridPos
                                    }
                                } as any} 
                            />
                            
                            <div className="space-y-8 w-full px-4">
                                <div className="space-y-2">
                                    <h4 className="text-[9px] font-bold uppercase tracking-widest opacity-40">Active Permissions</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { l: "Voice RTC", v: intake.capabilities.voice },
                                            { l: "Chat/Text", v: intake.capabilities.chat },
                                            { l: "Vision", v: intake.capabilities.vision },
                                            { l: "Document IO", v: intake.capabilities.documents },
                                        ].map(p => (
                                            <div key={p.l} className={cn("text-[8px] font-bold uppercase p-2 border", p.v ? "bg-black text-white border-black" : "border-black/5 text-[#1A1A1A]/20")}>
                                                {p.l}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                     <h4 className="text-[9px] font-bold uppercase tracking-widest opacity-40">Identity Context</h4>
                                     <p className="text-[10px] italic leading-relaxed text-[#1A1A1A]/60">
                                         Role mapped to {intake.industry || "Unspecified Market"} logic. Governance thresholds active for 90-day deployment window.
                                     </p>
                                </div>
                            </div>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* VM MODAL */}
            <AnimatePresence>
                {activeVM && (
                    <AgentVM vm={activeVM} onClose={() => setActiveVM(null)} />
                )}
            </AnimatePresence>

            {/* PROVISIONING OVERLAY */}
            <AnimatePresence>
                {isProvisioning && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[2000] bg-[#FBFBF9] flex flex-col items-center justify-center p-12 text-center"
                    >
                        <div className="w-64 h-[1px] bg-black/10 relative overflow-hidden mb-12">
                            <motion.div 
                                initial={{ x: '-100%' }}
                                animate={{ x: '100%' }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                className="absolute inset-y-0 w-1/2 bg-black"
                            />
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-4xl font-serif italic tracking-tighter">Initialising Digital Unit</h2>
                            <div className="font-mono text-[10px] uppercase opacity-40 tracking-[0.3em]">
                                Mapping Substrate â€¢ Binding Identity â€¢ Securing Governance
                            </div>
                        </div>

                        <div className="mt-20 flex gap-8">
                             {[1, 2, 3].map(i => (
                                 <motion.div 
                                    key={i}
                                    initial={{ opacity: 0.2 }}
                                    animate={{ opacity: [0.2, 1, 0.2] }}
                                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                    className="w-1 h-1 bg-black rounded-full"
                                 />
                             ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

const EmployeeRow: React.FC<{ emp: EmployeeVM, onOpenVM: () => void }> = ({ emp, onOpenVM }) => {
    return (
        <div className="bg-white border border-[#1A1A1A]/5 p-8 hover:border-[#1A1A1A]/20 transition-all group relative">
            <div className="absolute top-4 right-4 group-hover:scale-110 transition-transform">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-black/10 shadow-lg">
                    <VoxelAvatar profile={{ ...emp, jobFamily: emp.identity.jobFamily, avatarUrl: emp.avatarUrl, id: emp.employeeId, name: emp.displayName, gridPos: emp.identity.gridPos } as any} />
                </div>
            </div>
            
            <div className="mb-8">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-[0.2em]">{emp.employeeId}</span>
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-20">{emp.displayName}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span 
                            className={cn("px-2 py-0.5 text-[7px] font-bold text-white uppercase rounded-full", JOB_FAMILY_COLORS[emp.identity.jobFamily].bg)}
                        >
                            {emp.identity.jobFamily}
                        </span>
                        <span className={cn(
                            "px-2 py-0.5 text-[7px] font-bold uppercase rounded-full border",
                            emp.status === 'active'
                                ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                                : emp.status === 'pending'
                                    ? "border-amber-200 bg-amber-100 text-amber-700"
                                    : emp.status === 'suspended'
                                        ? "border-orange-200 bg-orange-100 text-orange-700"
                                        : "border-rose-200 bg-rose-100 text-rose-700"
                        )}>
                            {emp.status}
                        </span>
                    </div>
                </div>
                <h3 className="text-2xl font-serif italic tracking-tighter text-[#1A1A1A]">{emp.jobTitle}</h3>
            </div>

            <div className="space-y-4 pt-6 border-t border-black/5 mb-8">
                 <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-30">Security Tier</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest">Governed / L2</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-30">Readiness Score</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-green-600">{emp.identity.readinessScore}%</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-30">Compute Allocation</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest">Strata Pool (Low)</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-30">Billing</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest">${emp.billing.hourlyRateUsd}/hr â€¢ {emp.billing.paymentStatus}</span>
                 </div>
            </div>

            <button 
                onClick={onOpenVM}
                className="w-full py-4 bg-[#1A1A1A] text-white hover:bg-black transition-all flex items-center justify-center gap-3"
            >
                <Terminal size={12} className="opacity-50" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Console Interface</span>
            </button>
        </div>
    );
}

