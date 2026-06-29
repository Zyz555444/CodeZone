import { OpenAIProvider } from './openai';
import type { AIProvider } from '../types';

export class CustomProvider extends OpenAIProvider {
  id = 'CUSTOM' as AIProvider['id'];
  label = 'Custom OpenAI-Compatible';

  constructor(endpoint: string, apiKey: string, defaultModel: string) {
    super(endpoint, apiKey, defaultModel);
  }
}
