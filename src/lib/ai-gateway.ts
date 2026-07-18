import { callAiGateway, AiGatewayResult } from './ai-provider/client';
import { AiModelSlot } from './ai-model-resolver';

export interface AiGatewayOptions {
  shopId: string;
  endpoint: string;
  slot: AiModelSlot;
  messages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
  mode?: 'text' | 'json';
  temperature?: number;
  maxTokens?: number;
  responseFormat?: any;
  requiredFields?: string[];
  fallbackValue?: any;
  enableFallback?: boolean;
  skipQuotaCheck?: boolean;
  featureKey?: string;
}

export { callAiGateway };
export type { AiGatewayResult };
