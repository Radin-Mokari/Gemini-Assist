// Summarize Screen Content Flow
'use server';
/**
 * @fileOverview Summarizes the key information displayed on the user's screen.
 *
 * - summarizeScreenContent - A function that handles the summarization process.
 * - SummarizeScreenContentInput - The input type for the summarizeScreenContent function.
 * - SummarizeScreenContentOutput - The return type for the summarizeScreenContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeScreenContentInputSchema = z.object({
  screenDataUri: z
    .string()
    .describe(
      "A capture of the screen's content as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  audioTranscription: z.string().describe('The transcription of the user\'s audio.'),
});
export type SummarizeScreenContentInput = z.infer<typeof SummarizeScreenContentInputSchema>;

const SummarizeScreenContentOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the screen content.'),
});
export type SummarizeScreenContentOutput = z.infer<typeof SummarizeScreenContentOutputSchema>;

export async function summarizeScreenContent(
  input: SummarizeScreenContentInput
): Promise<SummarizeScreenContentOutput> {
  return summarizeScreenContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeScreenContentPrompt',
  input: {schema: SummarizeScreenContentInputSchema},
  output: {schema: SummarizeScreenContentOutputSchema},
  prompt: `You are an AI assistant that summarizes screen content for the user.

  The user will provide a screen capture and an audio transcription. You must use these to create a short summary of what is on the user's screen.

  Screen Content: {{media url=screenDataUri}}
  Audio Transcription: {{{audioTranscription}}}
  \n\
  Respond in the first person.
  I see that...`,
});

const summarizeScreenContentFlow = ai.defineFlow(
  {
    name: 'summarizeScreenContentFlow',
    inputSchema: SummarizeScreenContentInputSchema,
    outputSchema: SummarizeScreenContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
