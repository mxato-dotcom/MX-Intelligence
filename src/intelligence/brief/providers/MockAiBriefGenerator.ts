import type {
  BriefGenerationInput,
  BriefGeneratorProvider,
  GeneratedBrief,
} from '@/intelligence/brief/providers/BriefGeneratorProvider'
import { deterministicBriefGenerator } from '@/intelligence/brief/providers/DeterministicBriefGenerator'

const MOCK_AI_DELAY_MS = 750

/**
 * Simulates an AI brief provider without calling external APIs.
 * Wraps the deterministic generator and applies a short delay plus labeling
 * so future OpenAI/Gemini/Claude providers can replace this class.
 */
export class MockAiBriefGenerator implements BriefGeneratorProvider {
  readonly id = 'mock-ai'
  readonly name = 'Mock AI (Preview)'

  constructor(private readonly inner: BriefGeneratorProvider = deterministicBriefGenerator) {}

  async generateBrief(input: BriefGenerationInput): Promise<GeneratedBrief> {
    await new Promise((resolve) => setTimeout(resolve, MOCK_AI_DELAY_MS))

    const base = await this.inner.generateBrief(input)

    return {
      ...base,
      providerId: this.id,
      title: base.title.replace('Intelligence Brief', 'AI Intelligence Brief'),
      executive_summary: `[AI Preview] ${base.executive_summary}`,
      summary: `[AI Preview] ${base.summary}`,
      confidence_score: Math.min(100, base.confidence_score + 2),
    }
  }
}

export const mockAiBriefGenerator = new MockAiBriefGenerator()
