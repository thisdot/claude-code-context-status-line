import { main, getTotalTokens, formatStatusLine, getTranscriptPath } from '../src/context-status.js';

describe('getTotalTokens', () => {
  test('should extract tokens from valid JSONL lines', () => {
    const lines = [
      JSON.stringify({
        message: {
          usage: {
            input_tokens: 125000,
            cache_read_input_tokens: 0,
            cache_creation_input_tokens: 0
          }
        },
        isSidechain: false
      })
    ];

    const tokens = getTotalTokens(lines);
    expect(tokens).toBe(125000);
  });

  test('should return 0 for empty lines', () => {
    const tokens = getTotalTokens([]);
    expect(tokens).toBe(0);
  });

  test('should handle malformed JSON gracefully', () => {
    const lines = [
      '{"message": {"usage": {"input_tokens": 1000}}}',
      'this is not json',
      '{"incomplete": json',
      '{"message": {"usage": {"input_tokens": 1500}}}'
    ];

    const tokens = getTotalTokens(lines);
    expect(tokens).toBe(1500); // Should get the last valid entry
  });

  test('should sum all token types correctly', () => {
    const lines = [
      JSON.stringify({
        message: {
          usage: {
            input_tokens: 100000,
            cache_read_input_tokens: 25000,
            cache_creation_input_tokens: 400
          }
        },
        isSidechain: false
      })
    ];

    const tokens = getTotalTokens(lines);
    expect(tokens).toBe(125400);
  });

  test('should skip sidechain entries', () => {
    const lines = [
      JSON.stringify({ message: { usage: { input_tokens: 50000 } }, isSidechain: true }),
      JSON.stringify({ message: { usage: { input_tokens: 125000 } }, isSidechain: false })
    ];

    const tokens = getTotalTokens(lines);
    expect(tokens).toBe(125000);
  });

  test('should return 0 when no valid entries found', () => {
    const lines = [
      'invalid json',
      '{"no_message": true}',
      '{"message": {"no_usage": true}}'
    ];

    const tokens = getTotalTokens(lines);
    expect(tokens).toBe(0);
  });

  test('should process from end of array (last entry wins)', () => {
    const lines = [
      JSON.stringify({ message: { usage: { input_tokens: 1000 } }, isSidechain: false }),
      JSON.stringify({ message: { usage: { input_tokens: 2000 } }, isSidechain: false }),
      JSON.stringify({ message: { usage: { input_tokens: 3000 } }, isSidechain: false })
    ];

    const tokens = getTotalTokens(lines);
    expect(tokens).toBe(3000); // Should get the last valid entry
  });
});

describe('formatStatusLine', () => {
  test('should format zero tokens', () => {
    expect(formatStatusLine(0)).toBe('Context: 0');
  });

  test('should format small numbers', () => {
    expect(formatStatusLine(500)).toBe('Context: 500');
  });

  test('should format thousands with k suffix', () => {
    expect(formatStatusLine(1000)).toBe('Context: 1K');
    expect(formatStatusLine(1500)).toBe('Context: 1.5K');
    expect(formatStatusLine(125000)).toBe('Context: 125K');
    expect(formatStatusLine(125400)).toBe('Context: 125.4K');
  });

  test('should format millions with M suffix', () => {
    expect(formatStatusLine(1000000)).toBe('Context: 1M');
    expect(formatStatusLine(1500000)).toBe('Context: 1.5M');
  });
});

describe('getTranscriptPath', () => {
  test('should extract transcript_path from JSON input', () => {
    const input = '{"transcript_path": "/path/to/transcript.jsonl"}';
    const path = getTranscriptPath(input);
    expect(path).toBe('/path/to/transcript.jsonl');
  });

  test('should throw error for missing transcript_path', () => {
    const input = '{"other_field": "value"}';
    expect(() => getTranscriptPath(input)).toThrow('Missing transcript_path');
  });

  test('should throw error for invalid JSON', () => {
    const input = 'invalid json';
    expect(() => getTranscriptPath(input)).toThrow();
  });
});

describe('main', () => {
  test('should be defined and callable', () => {
    expect(typeof main).toBe('function');
    expect(main.constructor.name).toBe('AsyncFunction');
  });
});

describe('Integration Tests', () => {
  describe('Claude Code headless integration', () => {
    const TIMEOUT_MS = 30000;

    test('should process real Claude Code transcript and maintain schema compatibility', async () => {
      const testPrompt = 'Hello Claude, this is a test message for transcript validation.';
      let sessionId = null;
      let transcriptPath = null;

      try {
        // Step 1: Run Claude Code headlessly to generate a transcript
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);

        // First check if claude CLI exists
        try {
          await execAsync('which claude', { timeout: 5000 });
        } catch (error) {
          console.warn('Claude Code CLI not found, skipping integration test');
          return;
        }

        const result = await execAsync(`claude -p "${testPrompt}" --output-format json`, {
          timeout: TIMEOUT_MS,
          cwd: process.cwd()
        });

        expect(result.stdout).toBeDefined();

        // Parse the JSON response to extract session information
        const response = JSON.parse(result.stdout.trim());
        expect(response.session_id).toBeDefined();
        sessionId = response.session_id;

        // Step 2: Find the generated transcript file
        const fs = await import('fs');
        const path = await import('path');
        const os = await import('os');

        // Generate project hash from current directory
        const cwd = process.cwd();
        const projectHash = cwd.replace(/\//g, '-');
        transcriptPath = path.join(
          os.homedir(),
          '.claude',
          'projects',
          projectHash,
          `${sessionId}.jsonl`
        );

        // Wait a moment for file to be written
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verify the transcript file exists
        expect(fs.existsSync(transcriptPath)).toBe(true);

        // Step 3: Test our script with the real transcript directly
        const { spawn } = await import('child_process');
        const input = JSON.stringify({ transcript_path: transcriptPath });

        const scriptResult = await new Promise((resolve, reject) => {
          const child = spawn('node', ['src/context-status.js'], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'pipe']
          });

          let stdout = '';
          let stderr = '';

          child.stdout.on('data', (data) => {
            stdout += data.toString();
          });

          child.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          child.on('close', (code) => {
            resolve({ code, stdout, stderr });
          });

          child.on('error', reject);

          // Send input and close stdin
          child.stdin.write(input);
          child.stdin.end();
        });

        // Step 4: Verify the output format
        expect(scriptResult.code).toBe(0);
        expect(scriptResult.stdout).toMatch(/^Context: \d+(\.\d+)?[KM]?$/);
        expect(scriptResult.stdout.trim()).not.toBe('Context: 0'); // Should have some tokens

        // Step 5: Verify transcript schema compatibility
        const transcriptContent = fs.readFileSync(transcriptPath, 'utf8');
        const lines = transcriptContent.trim().split('\n').filter(line => line.trim());

        expect(lines.length).toBeGreaterThan(0);

        // Verify at least one line has the expected schema
        let foundValidEntry = false;
        for (const line of lines.slice().reverse()) { // Process from end like our script
          try {
            const entry = JSON.parse(line);
            if (entry.message?.usage && !entry.isSidechain) {
              expect(entry.message.usage).toHaveProperty('input_tokens');
              expect(typeof entry.message.usage.input_tokens).toBe('number');
              foundValidEntry = true;
              break;
            }
          } catch (e) {
            // Skip malformed entries
          }
        }

        expect(foundValidEntry).toBe(true);

      } catch (error) {
        if (error.message && error.message.includes('claude')) {
          console.warn('Claude Code CLI error, skipping integration test:', error.message);
          return;
        }
        throw error;
      } finally {
        // Cleanup: Remove the test transcript file
        if (transcriptPath && sessionId) {
          try {
            const fs = await import('fs');
            if (fs.existsSync(transcriptPath)) {
              fs.unlinkSync(transcriptPath);
            }
          } catch (cleanupError) {
            console.warn('Failed to cleanup test transcript:', cleanupError.message);
          }
        }
      }
    }, TIMEOUT_MS);

    test('should handle transcript schema changes gracefully', async () => {
      // Create a mock transcript with potential future schema changes
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');

      const tempDir = path.join(os.tmpdir(), 'claude-test');
      const testTranscriptPath = path.join(tempDir, 'test-schema.jsonl');

      try {
        // Ensure temp directory exists
        fs.mkdirSync(tempDir, { recursive: true });

        // Create mock transcript with various schema variations
        const mockEntries = [
          // Current schema
          { message: { usage: { input_tokens: 1000, cache_read_input_tokens: 500 } }, isSidechain: false },
          // Potential future schema with additional fields
          { message: { usage: { input_tokens: 2000, output_tokens: 100, new_field: 'test' } }, isSidechain: false },
          // Schema with missing optional fields
          { message: { usage: { input_tokens: 3000 } }, isSidechain: false },
          // Sidechain entry (should be ignored)
          { message: { usage: { input_tokens: 999999 } }, isSidechain: true },
          // Entry with completely different structure (should be ignored)
          { type: 'system', data: { some_field: 'value' } },
          // Final valid entry (this should be the result)
          { message: { usage: { input_tokens: 4000, cache_read_input_tokens: 1000 } }, isSidechain: false }
        ];

        const transcriptContent = mockEntries.map(entry => JSON.stringify(entry)).join('\n');
        fs.writeFileSync(testTranscriptPath, transcriptContent);

        const input = JSON.stringify({ transcript_path: testTranscriptPath });

        // Test our script with the mock transcript directly using spawn
        const { spawn } = await import('child_process');

        const scriptResult = await new Promise((resolve, reject) => {
          const child = spawn('node', ['src/context-status.js'], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'pipe']
          });

          let stdout = '';
          let stderr = '';

          child.stdout.on('data', (data) => {
            stdout += data.toString();
          });

          child.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          child.on('close', (code) => {
            resolve({ code, stdout, stderr });
          });

          child.on('error', reject);

          // Send input and close stdin
          child.stdin.write(input);
          child.stdin.end();
        });

        // Should get the last valid entry: 4000 + 1000 = 5000 tokens
        expect(scriptResult.code).toBe(0);
        expect(scriptResult.stdout.trim()).toBe('Context: 5K');

      } finally {
        // Cleanup
        try {
          if (fs.existsSync(testTranscriptPath)) {
            fs.unlinkSync(testTranscriptPath);
          }
          if (fs.existsSync(tempDir)) {
            fs.rmdirSync(tempDir);
          }
        } catch (cleanupError) {
          console.warn('Failed to cleanup test files:', cleanupError.message);
        }
      }
    });
  });
});

describe('Security Tests - Claude Code Integration', () => {
  test('should handle typical Claude Code transcript data', () => {
    const entry = JSON.stringify({
      message: {
        usage: {
          input_tokens: 125000,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0
        }
      },
      isSidechain: false
    });

    const lines = [entry];
    const result = getTotalTokens(lines);
    expect(result).toBe(125000);
  });

  test('should handle malformed JSON gracefully', () => {
    const lines = [
      '{"message": {"usage": {"input_tokens": 1000}}}',
      'this is not json',
      '{"incomplete": json',
      '{"message": {"usage": {"input_tokens": 1500}}}'
    ];

    const result = getTotalTokens(lines);
    expect(result).toBe(1500);
  });

  test('should skip sidechain entries', () => {
    const lines = [
      JSON.stringify({ message: { usage: { input_tokens: 1000 } }, isSidechain: true }),
      JSON.stringify({ message: { usage: { input_tokens: 2000 } }, isSidechain: false })
    ];
    const result = getTotalTokens(lines);
    expect(result).toBe(2000);
  });

  test('should return 0 for empty data', () => {
    expect(getTotalTokens([])).toBe(0);
    expect(getTotalTokens(['', '   '])).toBe(0);
  });
});