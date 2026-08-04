/*
FILE: src\lib\workforceStore.ts
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: DATA.LOCAL.STORE.W_OR_KF_OR_CE_ST_OR_E
REGION: 💾 DATA
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: Inferred by verification scanner
EXPORTS: Inferred by verification scanner
STATUS: ACTIVE
*/
import { create } from 'zustand';
import type { AuditReceipt, EmployeeVM, PrivacyState, TaskHistoryItem } from '../types';
import { generateId, generateToken } from './utils';
import {
  MANAGED_SUBSYSTEMS,
  createAuditReceipt,
  makeActivationLink,
  seedAuditReceipts,
  seedEmployees,
  syncEmployerVaults,
} from './workforceFactory';

type AdminAction =
  | 'Approve Contract'
  | 'Deny Contract'
  | 'Suspend Employee'
  | 'Revoke Employee'
  | 'Kill Session'
  | 'Rotate Activation Link'
  | 'Lock Device Binding'
  | 'Verify Privacy Compliance';

interface WorkforceStore {
  employees: EmployeeVM[];
  auditReceipts: AuditReceipt[];
  managedSubsystems: typeof MANAGED_SUBSYSTEMS;
  employerVaults: ReturnType<typeof syncEmployerVaults>;
  onboardEmployee: (employee: EmployeeVM) => void;
  approveContract: (employeeId: string, adminId: string, reason: string) => void;
  denyContract: (employeeId: string, adminId: string, reason: string) => void;
  suspendEmployee: (employeeId: string, adminId: string, reason: string) => void;
  revokeEmployee: (employeeId: string, adminId: string, reason: string) => void;
  killSession: (employeeId: string, adminId: string, reason: string) => void;
  rotateActivationLink: (employeeId: string, adminId: string, reason: string) => void;
  lockDeviceBinding: (employeeId: string, adminId: string, reason: string) => void;
  verifyPrivacyCompliance: (employeeId: string, adminId: string, reason: string) => void;
}

const initialEmployees = seedEmployees();
const initialAuditReceipts = seedAuditReceipts(initialEmployees);

const nowIso = () => new Date().toISOString();

const appendGovernedTask = (employee: EmployeeVM, action: AdminAction, reason: string) => ({
  ...employee,
  taskHistory: [
    {
      id: generateId('TASK'),
      title: action,
      summary: reason,
      status: action === 'Deny Contract' || action === 'Revoke Employee' || action === 'Suspend Employee' ? 'blocked' : 'completed',
      channel: action === 'Verify Privacy Compliance' ? 'privacy' : 'governance',
      timestamp: nowIso(),
      employerScoped: true,
    } satisfies TaskHistoryItem,
    ...employee.taskHistory,
  ],
  adminNotes: [reason, ...employee.adminNotes],
});

const updateWithReceipt = (
  employees: EmployeeVM[],
  employeeId: string,
  action: AdminAction,
  adminId: string,
  reason: string,
  recipe: (employee: EmployeeVM) => EmployeeVM
) => {
  let updatedEmployee: EmployeeVM | undefined;

  const nextEmployees = employees.map((employee) => {
    if (employee.employeeId !== employeeId) {
      return employee;
    }

    updatedEmployee = appendGovernedTask(recipe(employee), action, reason);
    return updatedEmployee;
  });

  if (!updatedEmployee) {
    return {
      employees,
      auditReceipts: [] as AuditReceipt[],
      employerVaults: syncEmployerVaults(employees),
    };
  }

  return {
    employees: nextEmployees,
    auditReceipts: [createAuditReceipt(updatedEmployee, action, adminId, reason),] as AuditReceipt[],
    employerVaults: syncEmployerVaults(nextEmployees),
  };
};

const updatePrivacyState = (employee: EmployeeVM): PrivacyState => {
  if (employee.privacy.globalMemoryLeak || !employee.privacy.documentsIsolated) {
    return 'blocked';
  }
  if (employee.privacy.crossEmployerSharingAuthorized) {
    return 'warning';
  }
  return 'compliant';
};

export const useWorkforceStore = create<WorkforceStore>((set) => ({
  employees: initialEmployees,
  auditReceipts: initialAuditReceipts,
  managedSubsystems: MANAGED_SUBSYSTEMS,
  employerVaults: syncEmployerVaults(initialEmployees),

  onboardEmployee: (employee) =>
    set((state) => {
      const nextEmployees = [employee, ...state.employees];
      return {
        employees: nextEmployees,
        employerVaults: syncEmployerVaults(nextEmployees),
      };
    }),

  approveContract: (employeeId, adminId, reason) =>
    set((state) => {
      const result = updateWithReceipt(
        state.employees,
        employeeId,
        'Approve Contract',
        adminId,
        reason,
        (employee) => ({
          ...employee,
          status: 'active',
          contractStatus: 'approved',
          sessionStatus: 'live',
          billing: {
            ...employee.billing,
            employerPaid: true,
            paymentStatus: 'paid',
          },
          contract: {
            ...employee.contract,
            approvedAt: nowIso(),
            approvedBy: adminId,
            paymentStatus: 'paid',
            paymentAuthorized: true,
            paymentCaptured: true,
          },
          deployment: {
            ...employee.deployment,
            qrStatus: 'active',
            lastSessionHeartbeat: nowIso(),
          },
          manifest: {
            ...employee.manifest,
            certificationStatus: 'certified',
            lastIntegrityCheck: nowIso(),
          },
        })
      );

      return {
        employees: result.employees,
        auditReceipts: [...result.auditReceipts, ...state.auditReceipts],
        employerVaults: result.employerVaults,
      };
    }),

  denyContract: (employeeId, adminId, reason) =>
    set((state) => {
      const result = updateWithReceipt(
        state.employees,
        employeeId,
        'Deny Contract',
        adminId,
        reason,
        (employee) => ({
          ...employee,
          status: 'denied',
          contractStatus: 'denied',
          sessionStatus: 'killed',
          contract: {
            ...employee.contract,
            deniedAt: nowIso(),
            deniedBy: adminId,
            denialReason: reason,
            paymentStatus: 'pending',
          },
          billing: {
            ...employee.billing,
            employerPaid: false,
            paymentStatus: 'pending',
          },
          deployment: {
            ...employee.deployment,
            qrStatus: 'revoked',
            lastSessionHeartbeat: nowIso(),
          },
        })
      );

      return {
        employees: result.employees,
        auditReceipts: [...result.auditReceipts, ...state.auditReceipts],
        employerVaults: result.employerVaults,
      };
    }),

  suspendEmployee: (employeeId, adminId, reason) =>
    set((state) => {
      const result = updateWithReceipt(
        state.employees,
        employeeId,
        'Suspend Employee',
        adminId,
        reason,
        (employee) => ({
          ...employee,
          status: 'suspended',
          sessionStatus: 'suspended',
          blockedActions: [
            {
              id: generateId('BLOCK'),
              action: 'Task execution halted',
              reason,
              policy: 'Leeway Governance / Suspension Gate',
              timestamp: nowIso(),
            },
            ...employee.blockedActions,
          ],
          deployment: {
            ...employee.deployment,
            lastSessionHeartbeat: nowIso(),
          },
        })
      );

      return {
        employees: result.employees,
        auditReceipts: [...result.auditReceipts, ...state.auditReceipts],
        employerVaults: result.employerVaults,
      };
    }),

  revokeEmployee: (employeeId, adminId, reason) =>
    set((state) => {
      const result = updateWithReceipt(
        state.employees,
        employeeId,
        'Revoke Employee',
        adminId,
        reason,
        (employee) => ({
          ...employee,
          status: 'revoked',
          contractStatus: 'revoked',
          sessionStatus: 'revoked',
          token: `revoked-${generateToken().slice(0, 12)}`,
          blockedActions: [
            {
              id: generateId('BLOCK'),
              action: 'Activation link invalidated',
              reason,
              policy: 'Leeway Governance / Revocation Gate',
              timestamp: nowIso(),
            },
            ...employee.blockedActions,
          ],
          deployment: {
            ...employee.deployment,
            activationLink: `/revoked/${employee.employeeId}`,
            qrStatus: 'revoked',
            lastRotatedAt: nowIso(),
            lastSessionHeartbeat: nowIso(),
          },
          privacy: {
            ...employee.privacy,
            compliant: false,
            state: 'warning',
            lastVerifiedAt: nowIso(),
          },
          manifest: {
            ...employee.manifest,
            certificationStatus: 'revoked',
            lastIntegrityCheck: nowIso(),
          },
        })
      );

      return {
        employees: result.employees,
        auditReceipts: [...result.auditReceipts, ...state.auditReceipts],
        employerVaults: result.employerVaults,
      };
    }),

  killSession: (employeeId, adminId, reason) =>
    set((state) => {
      const result = updateWithReceipt(
        state.employees,
        employeeId,
        'Kill Session',
        adminId,
        reason,
        (employee) => ({
          ...employee,
          sessionStatus: employee.status === 'revoked' ? 'revoked' : 'killed',
          blockedActions: [
            {
              id: generateId('BLOCK'),
              action: 'Live session terminated',
              reason,
              policy: 'SUM Orchestrator / Session Monitor',
              timestamp: nowIso(),
            },
            ...employee.blockedActions,
          ],
          deployment: {
            ...employee.deployment,
            lastSessionHeartbeat: nowIso(),
          },
        })
      );

      return {
        employees: result.employees,
        auditReceipts: [...result.auditReceipts, ...state.auditReceipts],
        employerVaults: result.employerVaults,
      };
    }),

  rotateActivationLink: (employeeId, adminId, reason) =>
    set((state) => {
      const result = updateWithReceipt(
        state.employees,
        employeeId,
        'Rotate Activation Link',
        adminId,
        reason,
        (employee) => {
          const nextToken = generateToken();
          return {
            ...employee,
            token: nextToken,
            deployment: {
              ...employee.deployment,
              activationLink: makeActivationLink(employee.employeeId, nextToken),
              qrStatus: 'rotated',
              lastRotatedAt: nowIso(),
              lastSessionHeartbeat: nowIso(),
            },
          };
        }
      );

      return {
        employees: result.employees,
        auditReceipts: [...result.auditReceipts, ...state.auditReceipts],
        employerVaults: result.employerVaults,
      };
    }),

  lockDeviceBinding: (employeeId, adminId, reason) =>
    set((state) => {
      const result = updateWithReceipt(
        state.employees,
        employeeId,
        'Lock Device Binding',
        adminId,
        reason,
        (employee) => ({
          ...employee,
          employerBinding: {
            ...employee.employerBinding,
            deviceLocked: true,
          },
        })
      );

      return {
        employees: result.employees,
        auditReceipts: [...result.auditReceipts, ...state.auditReceipts],
        employerVaults: result.employerVaults,
      };
    }),

  verifyPrivacyCompliance: (employeeId, adminId, reason) =>
    set((state) => {
      const result = updateWithReceipt(
        state.employees,
        employeeId,
        'Verify Privacy Compliance',
        adminId,
        reason,
        (employee) => {
          const stateValue = updatePrivacyState(employee);
          return {
            ...employee,
            privacy: {
              ...employee.privacy,
              state: stateValue,
              compliant: stateValue === 'compliant',
              lastVerifiedAt: nowIso(),
            },
          };
        }
      );

      return {
        employees: result.employees,
        auditReceipts: [...result.auditReceipts, ...state.auditReceipts],
        employerVaults: result.employerVaults,
      };
    }),
}));

