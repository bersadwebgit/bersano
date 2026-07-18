import { mockCompletionResponse } from '../../scripts/mock-setup';

(globalThis as any).mockChatCompletionGlobal = async (request: { model: string }, _opts: unknown) => {
  return {
    success: true,
    text: mockCompletionResponse.text,
    model: request.model,
  };
};
export { mockCompletionResponse };
