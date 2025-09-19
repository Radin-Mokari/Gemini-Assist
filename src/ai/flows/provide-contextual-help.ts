// This is a server-side code.
'use server';

/**
 * @fileOverview This file defines a Genkit flow for providing real-time contextual help based on screen and audio input.
 *
 * - provideContextualHelp - A function that accepts screen data URI and audio and returns instructions.
 * - ProvideContextualHelpInput - The input type for the provideContextualHelp function.
 * - ProvideContextualHelpOutput - The return type for the provideContextualHelp function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Define the input schema
const ProvideContextualHelpInputSchema = z.object({
  screenDataUri: z
    .string()
    .describe(
      "A photo of the user's screen, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  audioTranscription: z.string().describe('The transcription of the user\'s audio.'),
});
export type ProvideContextualHelpInput = z.infer<typeof ProvideContextualHelpInputSchema>;

// Define the output schema
const ProvideContextualHelpOutputSchema = z.object({
  instructions: z.string().describe('Contextually relevant instructions for the user.'),
});
export type ProvideContextualHelpOutput = z.infer<typeof ProvideContextualHelpOutputSchema>;

// Exported function to call the flow
export async function provideContextualHelp(input: ProvideContextualHelpInput): Promise<ProvideContextualHelpOutput> {
  return provideContextualHelpFlow(input);
}

// Define the prompt
const provideContextualHelpPrompt = ai.definePrompt({
  name: 'provideContextualHelpPrompt',
  input: { schema: ProvideContextualHelpInputSchema },
  output: { schema: ProvideContextualHelpOutputSchema },
  prompt: `You are an AI assistant that provides real-time instructions to the user based on their screen content and audio input.

  Analyze the user's screen content and audio transcription to understand their current task and provide contextually relevant instructions.

  Screen Content: {{media url=screenDataUri}}
  Audio Transcription: {{{audioTranscription}}}

  Instructions:`,
});

// Define the flow
const provideContextualHelpFlow = ai.defineFlow(
  {
    name: 'provideContextualHelpFlow',
    inputSchema: ProvideContextualHelpInputSchema,
    outputSchema: ProvideContextualHelpOutputSchema,
  },
  async (input) => {
    const { output } = await provideContextualHelpPrompt(input);
    return output!;
  }
);
