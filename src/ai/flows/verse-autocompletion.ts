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

const getVerseTool = ai.defineTool(
    {
        name: 'getVerse',
        description: 'Retrieves the text of a Bible verse from the Reina Valera 1960 version.',
        inputSchema: z.object({ verseReference: z.string() }),
        outputSchema: z.object({ verseText: z.string() }),
    },
    async (input) => {
        return { verseText: await getVerse(input.verseReference) ?? "No se encontró el versículo." };
    }
);


const verseAutocompletionFlow = ai.defineFlow(
  {
    name: 'verseAutocompletionFlow',
    inputSchema: VerseAutocompletionInputSchema,
    outputSchema: VerseAutocompletionOutputSchema,
  },
  async (input) => {
    // For this specific flow, we always want to call the tool.
    // We can call the tool directly instead of asking the model to do it.
    const toolOutput = await getVerseTool({ verseReference: input.verseReference });
    return { verseText: toolOutput.verseText };
  }
);
