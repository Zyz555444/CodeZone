import { OpenAIProvider } from './openai';

export class CustomProvider extends OpenAIProvider {
  id = 'CUSTOM' as const;
  label = 'Custom OpenAI-Compatible';

  constructor(endpoint: string, apiKey: string, defaultModel: string) {
    super(endpoint, apiKey, defaultModel);
  }
}
