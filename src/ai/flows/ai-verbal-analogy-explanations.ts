'use server';
/**
 * @fileOverview This file provides an AI-powered verbal analogy explanation agent.
 *
 * - getAiVerbalAnalogyExplanation - A function that generates detailed semantic explanations for verbal analogy questions.
 * - AiVerbalAnalogyExplanationInput - The input type for the getAiVerbalAnalogyExplanation function.
 * - AiVerbalAnalogyExplanationOutput - The return type for the getAiVerbalAnalogyExplanation function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AiVerbalAnalogyExplanationInputSchema = z.object({
  question: z.string().describe('The verbal analogy question, e.g., "عَصَبَة : نَاس".'),
  options: z.array(z.string()).describe('An array of possible answer options.'),
  correctAnswer: z.string().describe('The correct answer option.'),
});
export type AiVerbalAnalogyExplanationInput = z.infer<typeof AiVerbalAnalogyExplanationInputSchema>;

const AiVerbalAnalogyExplanationOutputSchema = z.object({
  explanation: z.string().describe('A detailed semantic explanation for the verbal analogy, covering the logical relationship, why the correct answer is right, and why other options are wrong.'),
});
export type AiVerbalAnalogyExplanationOutput = z.infer<typeof AiVerbalAnalogyExplanationOutputSchema>;

export async function getAiVerbalAnalogyExplanation(
  input: AiVerbalAnalogyExplanationInput
): Promise<AiVerbalAnalogyExplanationOutput> {
  return aiVerbalAnalogyExplanationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'verbalAnalogyExplanationPrompt',
  input: { schema: AiVerbalAnalogyExplanationInputSchema },
  output: { schema: AiVerbalAnalogyExplanationOutputSchema },
  prompt: `You are an expert in verbal analogies and their underlying logical relationships. Your task is to provide a comprehensive semantic explanation for a given verbal analogy question.

Here is the analogy question:
Analogy: "{{{question}}}"

Here are the possible options:
{{#each options}}
- {{{this}}}
{{/each}}

The correct answer is: "{{{correctAnswer}}}"

Provide a detailed explanation that covers the following:
1.  **Identify the logical relationship** between the two words in the original analogy (e.g., part-to-whole, cause-and-effect, synonym, antonym, object-to-function, etc.).
2.  **Explain why the correct answer ("{{{correctAnswer}}}}") perfectly matches this logical relationship.**
3.  **Explain why each of the incorrect options does NOT match the logical relationship** or why they are semantically or logically flawed compared to the correct answer.

Ensure your explanation is clear, concise, and educational, helping the user understand the reasoning deeply.
`,
});

const aiVerbalAnalogyExplanationFlow = ai.defineFlow(
  {
    name: 'aiVerbalAnalogyExplanationFlow',
    inputSchema: AiVerbalAnalogyExplanationInputSchema,
    outputSchema: AiVerbalAnalogyExplanationOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
