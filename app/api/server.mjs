import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// Register ts-node ESM loader for this directory
register('ts-node/esm', pathToFileURL('./'));

// Import the TypeScript server entry
import './server.ts';