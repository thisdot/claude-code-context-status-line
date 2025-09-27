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
    const transcriptPath = getTranscriptPath(await text(process.stdin));
    const filePath = path.resolve(transcriptPath);

    const transcriptContent = await readFile(filePath, 'utf8');

    const tokens = getTotalTokens(transcriptContent.split('\n'));
    process.stdout.write(formatStatusLine(tokens));
  } catch (error) {
    process.stdout.write(formatErrorStatusLine());
  }
}

function getTranscriptPath(input) {
  const { transcript_path } = JSON.parse(input);
  if (!transcript_path) {
    throw new Error('Missing transcript_path');
  }
  return transcript_path;
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

function formatStatusLine(tokens) {
  const formatted = new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(tokens);

  return `Context: ${formatted}`;
}

function formatErrorStatusLine() {
  return 'Context: -';
}

// Export the main API
export { main, getTotalTokens, getTranscriptPath, formatStatusLine };

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}