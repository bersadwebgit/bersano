import { ChangeSetDto, ChangeStepDto } from './change-set';

export interface AgentLifecycleEvent {
  requestId: string;
  shopId: string;
  actorId: string;
  timestamp: Date;
}

export interface PlanCreatedEvent extends AgentLifecycleEvent {
  changeSet: ChangeSetDto;
}

export interface ExecutionStartedEvent extends AgentLifecycleEvent {
  changeSetId: string;
}

export interface StepExecutedEvent extends AgentLifecycleEvent {
  changeSetId: string;
  step: ChangeStepDto;
  durationMs: number;
}

export interface ExecutionCompletedEvent extends AgentLifecycleEvent {
  changeSetId: string;
  status: 'completed' | 'failed';
  error?: string;
}

export interface RollbackStartedEvent extends AgentLifecycleEvent {
  changeSetId: string;
}

export interface RollbackCompletedEvent extends AgentLifecycleEvent {
  changeSetId: string;
  status: 'rolled_back' | 'rollback_failed';
  error?: string;
}
