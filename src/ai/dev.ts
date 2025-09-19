import { config } from 'dotenv';
config();

import '@/ai/flows/provide-contextual-help.ts';
import '@/ai/flows/summarize-screen-content.ts';
import '@/ai/flows/generate-initial-instructions.ts';