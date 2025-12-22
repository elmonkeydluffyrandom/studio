'use server';

/**
 * @fileOverview AI-powered verse autocompletion flow using the Reina Valera 1960 Bible.
 *
 * - verseAutocompletion - A function that handles the verse autocompletion process.
 * - VerseAutocompletionInput - The input type for the verseAutocompletion function.
 * - VerseAutocompletionOutput - The return type for the verseAutocompletion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getVerse } from '@/services/bible-service';

const VerseAutocompletionInputSchema = z.object({
  verseReference: z
    .string()
    .describe('The Bible verse reference (e.g., Salmos 23) to retrieve.'),
});
export type VerseAutocompletionInput = z.infer<typeof VerseAutocompletionInputSchema>;

const VerseAutocompletionOutputSchema = z.object({
  verseText: z
    .string()
    .describe('The corresponding verse text from the Reina Valera 1960 Bible version.'),
});
export type VerseAutocompletionOutput = z.infer<typeof VerseAutocompletionOutputSchema>;

export async function verseAutocompletion(input: VerseAutocompletionInput): Promise<VerseAutocompletionOutput> {
  return verseAutocompletionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'verseAutocompletionPrompt',
  input: {schema: VerseAutocompletionInputSchema},
  output: {schema: VerseAutocompletionOutputSchema},
  prompt: `You are a helpful assistant that retrieves bible verses from the Reina Valera 1960 bible.

  The user will provide a verse reference, and you should return the corresponding verse text.

  Verse Reference: {{{verseReference}}}
  `,
});

const verseAutocompletionFlow = ai.defineFlow(
  {
    name: 'verseAutocompletionFlow',
    inputSchema: VerseAutocompletionInputSchema,
    outputSchema: VerseAutocompletionOutputSchema,
  },
  async input => {
    // Before calling the LLM, check if the verse can be retrieved directly
    // from the bible-service.
    try {
      const verseText = await getVerse(input.verseReference);
      if (verseText) {
        return { verseText };
      }
    } catch (e) {
      // Verse not found in local data, proceed to LLM.
      console.log("Verse not found in bible-service.  Using LLM.");
    }

    const {output} = await prompt(input);
    return output!;
  }
);
