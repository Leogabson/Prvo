import * as dotenv from 'dotenv';
import { apiEnvSchema, validateEnv, type ApiEnv } from '@prvo/shared';

// Load .env from root and local directory
dotenv.config({ path: '../../.env' });
dotenv.config();

export const env: ApiEnv = validateEnv(apiEnvSchema, process.env, 'API');
