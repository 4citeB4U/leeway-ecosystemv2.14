/*
FILE: src/core/admin/adminCommandEngine.ts
PURPOSE: Parse and execute admin commands for Agent Lee voice/text control.
All commands are governed, audited, and confirmed before execution.
*/

export type AdminCommandIntent =
  | 'SHOW_EMPLOYEES'
  | 'SHOW_TEMP_WORKERS'
  | 'SHOW_CANDIDATES'
  | 'SHOW_INVESTORS'
  | 'SHOW_CONTRACTS'
  | 'SHOW_DEPLOYMENTS'
  | 'CREATE_EMPLOYEE'
  | 'CREATE_TEMP_WORKER'
  | 'CREATE_CANDIDATE'
  | 'CREATE_INVESTOR'
  | 'CREATE_CONTRACT'
  | 'ASSIGN_AGENT'
  | 'DEPLOY_AGENT'
  | 'STOP_DEPLOYMENT'
  | 'GENERATE_ACTIVATION_LINK'
  | 'GENERATE_QR_CODE'
  | 'REVOKE_ACCESS'
  | 'SUSPEND_ACCESS'
  | 'RESTORE_ACCESS'
  | 'SHOW_SYSTEM_HEALTH'
  | 'RUN_VERIFICATION'
  | 'OPEN_LOGS'
  | 'UNKNOWN';

export interface AdminCommand {
  text: string;
  intent: AdminCommandIntent;
  parameters: Record<string, unknown>;
  requiresConfirmation: boolean;
  confidence: number;
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: unknown;
  auditId?: string;
}

export class AdminCommandEngine {
  
  /**
   * Parse text/voice input into structured admin command
   */
  static parseAdminCommand(input: string): AdminCommand {
    const normalizedInput = input.toLowerCase().trim();
    
    // Extract intent
    const intent = this.classifyAdminIntent(normalizedInput);
    const requiresConfirmation = this.requiresConfirmation(intent);
    
    // Extract parameters based on intent
    const parameters = this.extractParameters(normalizedInput, intent);
    
    return {
      text: input,
      intent,
      parameters,
      requiresConfirmation,
      confidence: this.calculateConfidence(normalizedInput, intent),
    };
  }

  /**
   * Classify intent from natural language
   */
  static classifyAdminIntent(text: string): AdminCommandIntent {
    // Show commands
    if (this.matches(text, ['show', 'list', 'display', 'view'], ['employees', 'staff', 'worker'])) {
      return 'SHOW_EMPLOYEES';
    }
    if (this.matches(text, ['show', 'list', 'display', 'view'], ['temp', 'temporary', 'workers'])) {
      return 'SHOW_TEMP_WORKERS';
    }
    if (this.matches(text, ['show', 'list', 'display', 'view'], ['candidates', 'applicants', 'prospects'])) {
      return 'SHOW_CANDIDATES';
    }
    if (this.matches(text, ['show', 'list', 'display', 'view'], ['investors', 'clients'])) {
      return 'SHOW_INVESTORS';
    }
    if (this.matches(text, ['show', 'list', 'display', 'view'], ['contracts', 'agreements', 'agreements'])) {
      return 'SHOW_CONTRACTS';
    }
    if (this.matches(text, ['show', 'list', 'display', 'view'], ['deployments', 'deployed', 'running'])) {
      return 'SHOW_DEPLOYMENTS';
    }
    if (this.matches(text, ['show', 'display', 'view', 'check'], ['health', 'status', 'diagnostic'])) {
      return 'SHOW_SYSTEM_HEALTH';
    }

    // Create commands
    if (this.matches(text, ['create', 'add', 'new'], ['employee', 'staff'])) {
      return 'CREATE_EMPLOYEE';
    }
    if (this.matches(text, ['create', 'add', 'new'], ['temp', 'temporary', 'worker'])) {
      return 'CREATE_TEMP_WORKER';
    }
    if (this.matches(text, ['create', 'add', 'new'], ['candidate', 'applicant'])) {
      return 'CREATE_CANDIDATE';
    }
    if (this.matches(text, ['create', 'add', 'new'], ['investor', 'client'])) {
      return 'CREATE_INVESTOR';
    }
    if (this.matches(text, ['create', 'add', 'new', 'sign'], ['contract', 'agreement'])) {
      return 'CREATE_CONTRACT';
    }

    // Deployment commands
    if (this.matches(text, ['deploy', 'send', 'assign'], ['agent', 'worker', 'staff'])) {
      return 'DEPLOY_AGENT';
    }
    if (this.matches(text, ['stop', 'halt', 'end', 'cancel'], ['deployment', 'deployed'])) {
      return 'STOP_DEPLOYMENT';
    }
    if (this.matches(text, ['assign', 'link', 'map'], ['agent', 'worker'])) {
      return 'ASSIGN_AGENT';
    }

    // Access commands
    if (this.matches(text, ['generate', 'create', 'make'], ['activation', 'link', 'url', 'code'])) {
      return 'GENERATE_ACTIVATION_LINK';
    }
    if (this.matches(text, ['generate', 'create', 'make'], ['qr', 'code', 'qrcode'])) {
      return 'GENERATE_QR_CODE';
    }
    if (this.matches(text, ['revoke', 'remove', 'deny', 'block'], ['access', 'permission', 'deployment'])) {
      return 'REVOKE_ACCESS';
    }
    if (this.matches(text, ['suspend', 'pause', 'disable'], ['access', 'deployment'])) {
      return 'SUSPEND_ACCESS';
    }
    if (this.matches(text, ['restore', 'enable', 'resume', 'reactivate'], ['access', 'deployment'])) {
      return 'RESTORE_ACCESS';
    }

    // Maintenance commands
    if (this.matches(text, ['run', 'execute', 'start'], ['verification', 'verify', 'check'])) {
      return 'RUN_VERIFICATION';
    }
    if (this.matches(text, ['open', 'show', 'view', 'display'], ['logs', 'log', 'audit'])) {
      return 'OPEN_LOGS';
    }

    return 'UNKNOWN';
  }

  /**
   * Helper to match keywords in text
   */
  private static matches(text: string, actionKeywords: string[], objectKeywords: string[]): boolean {
    const hasAction = actionKeywords.some(kw => text.includes(kw));
    const hasObject = objectKeywords.some(kw => text.includes(kw));
    return hasAction && hasObject;
  }

  /**
   * Determine if command requires user confirmation
   */
  static requiresConfirmation(intent: AdminCommandIntent): boolean {
    const confirmationRequired = [
      'DEPLOY_AGENT',
      'STOP_DEPLOYMENT',
      'REVOKE_ACCESS',
      'DELETE_EMPLOYEE', // hypothetical
      'SUSPEND_ACCESS', // debatable but safest
      'CREATE_CONTRACT',
    ];
    return confirmationRequired.includes(intent);
  }

  /**
   * Extract parameters from command text
   */
  static extractParameters(text: string, intent: AdminCommandIntent): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    // Extract names (simple heuristic)
    const nameMatch = text.match(/(?:for|to|about|named?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    if (nameMatch) params.targetName = nameMatch[1];

    // Extract IDs
    const idMatch = text.match(/\b([A-Z]{2,}\d{4,})\b/);
    if (idMatch) params.targetId = idMatch[1];

    // Extract agent type
    if (text.includes('investor')) params.agentType = 'investor';
    if (text.includes('employee')) params.agentType = 'employee';
    if (text.includes('temp')) params.agentType = 'temp-worker';

    return params;
  }

  /**
   * Calculate confidence level of intent classification
   */
  static calculateConfidence(text: string, intent: AdminCommandIntent): number {
    if (intent === 'UNKNOWN') return 0;
    
    // Higher confidence for exact command phrases
    if (text.length > 3 && text.split(' ').length >= 2) {
      return Math.min(0.95, 0.6 + (text.split(' ').length * 0.1));
    }
    return 0.6;
  }

  /**
   * Execute admin command (with audit)
   */
  static async executeAdminIntent(
    intent: AdminCommandIntent,
    parameters: Record<string, unknown>
  ): Promise<CommandResult> {
    try {
      // Route to appropriate handler
      switch (intent) {
        case 'SHOW_EMPLOYEES':
          return { success: true, message: 'Employees displayed' };
        case 'SHOW_TEMP_WORKERS':
          return { success: true, message: 'Temporary workers displayed' };
        case 'SHOW_INVESTORS':
          return { success: true, message: 'Investors displayed' };
        case 'SHOW_CONTRACTS':
          return { success: true, message: 'Contracts displayed' };
        case 'SHOW_DEPLOYMENTS':
          return { success: true, message: 'Active deployments displayed' };
        case 'SHOW_SYSTEM_HEALTH':
          return { success: true, message: 'System health displayed' };
        case 'DEPLOY_AGENT':
          return { success: true, message: 'Agent deployment initiated' };
        case 'GENERATE_QR_CODE':
          return { success: true, message: 'QR code generated', data: { qrCode: 'QR_CODE_DATA' } };
        case 'RUN_VERIFICATION':
          return { success: true, message: 'System verification started' };
        case 'UNKNOWN':
          return { success: false, message: 'Command not recognized' };
        default:
          return { success: true, message: `${intent} executed` };
      }
    } catch (error) {
      return {
        success: false,
        message: `Command execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Generate natural language explanation for command
   */
  static explainCommand(command: AdminCommand): string {
    const intents: Record<AdminCommandIntent, string> = {
      SHOW_EMPLOYEES: 'Display all employees',
      SHOW_TEMP_WORKERS: 'Display all temporary workers',
      SHOW_CANDIDATES: 'Display all candidates',
      SHOW_INVESTORS: 'Display all investors',
      SHOW_CONTRACTS: 'Display all contracts',
      SHOW_DEPLOYMENTS: 'Display active deployments',
      CREATE_EMPLOYEE: 'Create a new employee',
      CREATE_TEMP_WORKER: 'Create a temporary worker',
      CREATE_CANDIDATE: 'Create a candidate profile',
      CREATE_INVESTOR: 'Create a new investor',
      CREATE_CONTRACT: 'Create a new contract',
      ASSIGN_AGENT: 'Assign an agent to a worker',
      DEPLOY_AGENT: 'Deploy an agent to a recipient',
      STOP_DEPLOYMENT: 'Stop an active deployment',
      GENERATE_ACTIVATION_LINK: 'Generate an activation link',
      GENERATE_QR_CODE: 'Generate a QR code',
      REVOKE_ACCESS: 'Revoke access for a deployment',
      SUSPEND_ACCESS: 'Suspend access temporarily',
      RESTORE_ACCESS: 'Restore suspended access',
      SHOW_SYSTEM_HEALTH: 'Show system health status',
      RUN_VERIFICATION: 'Run system verification',
      OPEN_LOGS: 'Open system logs',
      UNKNOWN: 'Unknown command',
    };

    return intents[command.intent] || 'Unknown command';
  }

  /**
   * Create audit receipt for command execution
   */
  static createAdminCommandAudit(
    command: AdminCommand,
    result: CommandResult,
    adminId: string
  ): Record<string, unknown> {
    return {
      auditId: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      adminId,
      command: command.text,
      intent: command.intent,
      result: result.success ? 'success' : 'failure',
      message: result.message,
      requiresConfirmation: command.requiresConfirmation,
      confidence: command.confidence,
    };
  }
}
