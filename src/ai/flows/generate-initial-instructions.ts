'use server';

/**
 * @fileOverview Provides initial guidance to new users based on their screen and audio input.
 *
 * - generateInitialInstructions -  A function that generates initial instructions based on screen and audio data.
 * - GenerateInitialInstructionsInput - The input type for the generateInitialInstructions function.
 * - GenerateInitialInstructionsOutput - The return type for the generateInitialInstructions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInitialInstructionsInputSchema = z.object({
  screenDataUri: z
    .string()
    .describe(
      "A data URI of the user's screen capture, including MIME type and Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  audioTranscription: z.string().describe('A transcription of the user audio input.'),
});

export type GenerateInitialInstructionsInput = z.infer<
  typeof GenerateInitialInstructionsInputSchema
>;

const GenerateInitialInstructionsOutputSchema = z.object({
  instructions: z.string().describe('The initial instructions for the user.'),
});

export type GenerateInitialInstructionsOutput = z.infer<
  typeof GenerateInitialInstructionsOutputSchema
>;

export async function generateInitialInstructions(
  input: GenerateInitialInstructionsInput
): Promise<GenerateInitialInstructionsOutput> {
  return generateInitialInstructionsFlow(input);
}

const initialInstructionsPrompt = ai.definePrompt({
  name: 'initialInstructionsPrompt',
  input: {schema: GenerateInitialInstructionsInputSchema},
  output: {schema: GenerateInitialInstructionsOutputSchema},
  prompt: `You are an AI assistant designed to guide new users based on their shared screen and audio. Analyze the screen content and the user's spoken input to provide initial instructions on how the application can assist them.

Screen Content: {{media url=screenDataUri}}
Audio Input: {{{audioTranscription}}}

Instructions:`,
});

const generateInitialInstructionsFlow = ai.defineFlow(
  {
    name: 'generateInitialInstructionsFlow',
    inputSchema: GenerateInitialInstructionsInputSchema,
    outputSchema: GenerateInitialInstructionsOutputSchema,
  },
  async input => {
    const {output} = await initialInstructionsPrompt(input);
    return output!;
  }
);
