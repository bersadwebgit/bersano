export type RiskLevel = 'low' | 'medium' | 'high';

export type ChangeSetStatus =
  | 'pending'
  | 'approved'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'rolled_back';

export type StepStatus = 'pending' | 'completed' | 'failed' | 'rolled_back';

export type StepAction = 'create' | 'update' | 'delete';

export interface Capability {
  name: string;
  description: string;
  riskLevel: RiskLevel;
  parameters: Record<string, unknown>; // JSON Schema format
}

export interface ChangeStepInput {
  action: StepAction;
  modelName: string;
  recordId?: string | null;
  beforeValue?: Record<string, unknown> | null;
  afterValue?: Record<string, unknown> | null;
  order?: number;
}

export interface ChangeSetInput {
  shopId: string;
  prompt: string;
  riskLevel: RiskLevel;
  riskAnalysis?: string | null;
  summary?: string | null;
  steps: ChangeStepInput[];
}
