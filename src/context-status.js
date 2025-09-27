#!/usr/bin/env node

/**
 * Claude Code Context Usage Status Line Script
 *
 * Restores context visibility for AWS Bedrock users by displaying
 * context window usage as "Context: 125k" in Claude Code's status line.
 *
 * @see https://github.com/thisdot/claude-code-context-status-line for installation and usage
 * @license MIT
 */

import { readFile } from 'fs/promises';
import { text } from 'node:stream/consumers';
import path from 'path';


async function main() {
  try {
    const inputData = await text(process.stdin);
    const { transcriptPath, modelName } = getTranscriptPathAndModel(inputData);
    const filePath = path.resolve(transcriptPath);

    const transcriptContent = await readFile(filePath, 'utf8');

    const tokens = getTotalTokens(transcriptContent.split('\n'));
    process.stdout.write(formatStatusLine(tokens, modelName));
  } catch {
    process.stdout.write(formatErrorStatusLine());
  }
}

function getTranscriptPathAndModel(input) {
  try {
    const data = JSON.parse(input);

    // Validate input structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid input format');
    }

    if (!data.transcript_path || typeof data.transcript_path !== 'string') {
      throw new Error('Missing or invalid transcript_path');
    }

    const transcriptPath = data.transcript_path;
    const modelName = (data.model?.display_name && typeof data.model.display_name === 'string')
      ? data.model.display_name
      : '-';

    return {
      transcriptPath,
      modelName
    };
  } catch (error) {
    // Return safe fallback values without exposing error details
    return {
      transcriptPath: '',
      modelName: '-'
    };
  }
}

function getTotalTokens(lines) {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) {continue;}
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    if (entry.isSidechain === true) {
      continue;
    }

    if (!entry.message?.usage?.input_tokens) {
      continue;
    }

    const {usage} = entry.message;

    const inputTokens = parseInt(usage.input_tokens, 10) || 0;
    const cacheReadTokens = parseInt(usage.cache_read_input_tokens || 0, 10) || 0;
    const cacheCreationTokens = parseInt(usage.cache_creation_input_tokens || 0, 10) || 0;

    const total = inputTokens + cacheReadTokens + cacheCreationTokens;
    return total;
  }

  return 0;
}

function formatStatusLine(tokens, modelName) {
  const formatted = new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(tokens);

  return `${modelName} (${formatted})`;
}

function formatErrorStatusLine() {
  return '- (-)';
}


// Export the main API
export { main, getTotalTokens, getTranscriptPathAndModel, formatStatusLine };

// Run main only when this exact file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
