import { AiModelSlot } from '../ai-model-resolver';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ChatMessagePart[];
}

export interface ChatMessagePart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  top_p?: number;
  stop?: string | string[];
  seed?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  response_format?: { type: 'json_object' | 'text' };
  tools?: any[];
  tool_choice?: any;
  parallel_tool_calls?: boolean;
  stream?: boolean;
  stream_options?: any;
  user?: string;
}

export interface EmbeddingRequest {
  model: string;
  input: string | string[];
  user?: string;
}

export interface AiProviderConfig {
  mode: 'gateway' | 'direct' | 'disabled';
  gatewayUrl?: string;
  gatewayToken?: string;
  directApiKey?: string;
  timeoutMs: number;
  allowDirect: boolean;
  defaultChatModel: string;
  simpleModel: string;
  complexModel: string;
  embeddingModel: string;
  aiEmbeddingBaseUrl?: string;
  aiEmbeddingApiKey?: string;
}

export interface AiLogContext {
  requestId?: string;
  shopId?: string;
  slot?: AiModelSlot;
  model?: string;
  // AI-008 (Phase C): per-route usage/quota context threaded through the openRouterFetch chokepoint.
  endpoint?: string;
  capability?: string;
  featureKey?: string;
  billingMode?: 'tenant' | 'platform';
  rootRequestId?: string;
  userId?: string;
}
