import { encodingForModel, TiktokenModel } from 'js-tiktoken';

let encoder: ReturnType<typeof encodingForModel> | null = null;

export function getEncoder(): ReturnType<typeof encodingForModel> {
  if (!encoder) {
    encoder = encodingForModel('gpt-4o' as TiktokenModel);
  }
  return encoder;
}

export function estimateTokens(text: string): number {
  try {
    return getEncoder().encode(text).length;
  } catch {
    return Math.ceil(text.length / 4);
  }
}

export function truncateByTokens(text: string, maxTokens: number): string {
  const enc = getEncoder();
  const tokens = enc.encode(text);
  if (tokens.length <= maxTokens) return text;
  return enc.decode(tokens.slice(0, maxTokens));
}
