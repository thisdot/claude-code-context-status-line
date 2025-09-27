#!/usr/bin/env node

/**
 * Claude Code Context Usage Status Line Script
 *
 * Restores context visibility for AWS Bedrock users by displaying
 * context window usage as "Context: 125k" in Claude Code's status line.
 *
 * @see https://github.com/thisdot/claude-code-context-status-line for installation and usage
 * @version 0.1.0
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
  const data = JSON.parse(input);
  if (!data.transcript_path) {
    throw new Error('Missing transcript_path');
  }

  const modelName = data.model?.display_name || '-';
  
  return {
    transcriptPath: data.transcript_path,
    modelName
  };
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

    const usage = entry.message.usage;
    const inputTokens = parseInt(usage.input_tokens, 10);
    const cacheReadTokens = parseInt(usage.cache_read_input_tokens || 0, 10);
    const cacheCreationTokens = parseInt(usage.cache_creation_input_tokens || 0, 10);

    return inputTokens + cacheReadTokens + cacheCreationTokens;
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

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}