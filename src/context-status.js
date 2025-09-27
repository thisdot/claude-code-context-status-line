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

    // Security: Validate and sanitize path
    const transcriptPath = sanitizePath(data.transcript_path);
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

    // Security: Validate and sanitize token values
    const inputTokens = safeParseInt(usage.input_tokens);
    const cacheReadTokens = safeParseInt(usage.cache_read_input_tokens || 0);
    const cacheCreationTokens = safeParseInt(usage.cache_creation_input_tokens || 0);

    const total = inputTokens + cacheReadTokens + cacheCreationTokens;

    // Security: Ensure result is finite and non-negative
    if (isFinite(total) && total >= 0) {
      return Math.floor(total);
    }
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

// Security helper functions
function sanitizePath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') {
    return '';
  }

  // Remove null bytes and other control characters
  // eslint-disable-next-line no-control-regex
  const cleanPath = inputPath.replace(/[\x00-\x1F\x7F]/g, '');

  // Basic path traversal protection - reject obvious attempts
  if (cleanPath.includes('../') ||
      cleanPath.includes('..\\') ||
      cleanPath.startsWith('/etc/') ||
      cleanPath.startsWith('/root/') ||
      cleanPath.includes('passwd') ||
      cleanPath.includes('shadow') ||
      /^[A-Z]:\\(Windows|System32|Program Files)/i.test(cleanPath)) {

    // Log security attempt but don't expose details
    console.error('[SECURITY] Rejected suspicious path pattern');
    return '';
  }

  return cleanPath;
}

function safeParseInt(value) {
  if (typeof value === 'number') {
    if (isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER) {
      return Math.floor(value);
    }
    return 0;
  }

  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (isFinite(parsed) && parsed >= 0 && parsed <= Number.MAX_SAFE_INTEGER) {
      return parsed;
    }
  }

  return 0;
}

// Export the main API
export { main, getTotalTokens, getTranscriptPathAndModel, formatStatusLine };

// Always run main when this file is executed as a script
// This works for both direct execution and npm bin symlinks
main();
