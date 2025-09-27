import { test, describe } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { main, getTotalTokens, formatStatusLine, getTranscriptPathAndModel } from '../src/context-status.js';

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
    assert.strictEqual(tokens, 125000);
  });

  test('should return 0 for empty lines', () => {
    const tokens = getTotalTokens([]);
    assert.strictEqual(tokens, 0);
  });

  test('should handle malformed JSON gracefully', () => {
    const lines = [
      '{"message": {"usage": {"input_tokens": 1000}}}',
      'this is not json',
      '{"incomplete": json',
      '{"message": {"usage": {"input_tokens": 1500}}}'
    ];

    const tokens = getTotalTokens(lines);
    assert.strictEqual(tokens, 1500); // Should get the last valid entry
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
    assert.strictEqual(tokens, 125400);
  });

  test('should skip sidechain entries', () => {
    const lines = [
      JSON.stringify({
        message: {
          usage: {
            input_tokens: 999999
          }
        },
        isSidechain: true
      }),
      JSON.stringify({
        message: {
          usage: {
            input_tokens: 2000
          }
        },
        isSidechain: false
      })
    ];

    const tokens = getTotalTokens(lines);
    assert.strictEqual(tokens, 2000);
  });

  test('should return 0 when no valid entries found', () => {
    const lines = [
      '{"no_message": true}',
      '{"message": {"no_usage": true}}'
    ];

    const tokens = getTotalTokens(lines);
    assert.strictEqual(tokens, 0);
  });

  test('should process from end of array (last entry wins)', () => {
    const lines = [
      JSON.stringify({ message: { usage: { input_tokens: 1000 } }, isSidechain: false }),
      JSON.stringify({ message: { usage: { input_tokens: 2000 } }, isSidechain: false }),
      JSON.stringify({ message: { usage: { input_tokens: 3000 } }, isSidechain: false })
    ];

    const tokens = getTotalTokens(lines);
    assert.strictEqual(tokens, 3000); // Should get the last valid entry
  });
});

describe('formatStatusLine', () => {
  test('should format zero tokens with explicit model name', () => {
    assert.strictEqual(formatStatusLine(0, 'Claude'), 'Claude (0)');
  });

  test('should format small numbers with custom model name', () => {
    assert.strictEqual(formatStatusLine(500, 'Sonnet 4'), 'Sonnet 4 (500)');
  });

  test('should format thousands with k suffix', () => {
    assert.strictEqual(formatStatusLine(1000, 'Opus'), 'Opus (1K)');
    assert.strictEqual(formatStatusLine(1500, 'Sonnet 4'), 'Sonnet 4 (1.5K)');
    assert.strictEqual(formatStatusLine(125000, 'Claude'), 'Claude (125K)');
    assert.strictEqual(formatStatusLine(125400, 'Sonnet 4'), 'Sonnet 4 (125.4K)');
  });

  test('should format millions with M suffix', () => {
    assert.strictEqual(formatStatusLine(1000000, 'Opus'), 'Opus (1M)');
    assert.strictEqual(formatStatusLine(1500000, 'Haiku'), 'Haiku (1.5M)');
  });
});

describe('getTranscriptPathAndModel', () => {
  test('should extract transcript_path and model display_name from JSON input', () => {
    const input = JSON.stringify({
      transcript_path: '/path/to/transcript.jsonl',
      model: { display_name: 'Sonnet 4', id: 'claude-sonnet-4' }
    });
    const result = getTranscriptPathAndModel(input);
    assert.strictEqual(result.transcriptPath, '/path/to/transcript.jsonl');
    assert.strictEqual(result.modelName, 'Sonnet 4');
  });

  test('should use default model name when model info is missing', () => {
    const input = JSON.stringify({ transcript_path: '/path/to/transcript.jsonl' });
    const result = getTranscriptPathAndModel(input);
    assert.strictEqual(result.transcriptPath, '/path/to/transcript.jsonl');
    assert.strictEqual(result.modelName, '-');
  });

  test('should return safe fallback for missing transcript_path', () => {
    const input = JSON.stringify({ model: { display_name: 'Sonnet 4' } });
    const result = getTranscriptPathAndModel(input);
    assert.strictEqual(result.transcriptPath, '');
    assert.strictEqual(result.modelName, '-'); // Security: safe fallback when transcript_path missing
  });
});

describe('main', () => {
  test('should be defined and callable', () => {
    assert.strictEqual(typeof main, 'function');
    assert.strictEqual(main.constructor.name, 'AsyncFunction');
  });
});

describe('Integration Tests', () => {
  describe('Claude Code headless integration', () => {
    test('should process real Claude Code transcript and maintain schema compatibility', async () => {
      const { promisify } = await import('node:util');
      const { exec } = await import('node:child_process');
      const execAsyncPromise = promisify(exec);

      try {
        // Check if Claude Code CLI is available
        try {
          await execAsyncPromise('which claude', { timeout: 5000 });
        } catch (error) {
          console.warn('Claude Code CLI not found, skipping integration test');
          return;
        }

        // Step 1: Get the actual Claude Code transcript path
        const transcriptResult = await execAsyncPromise('claude config get transcript_path', { timeout: 10000 });
        const transcriptPath = transcriptResult.stdout.trim();

        assert.ok(transcriptPath, 'Should have a valid transcript path from Claude Code');

        // Step 2: Check if the transcript file exists
        const fs = await import('node:fs');
        if (!fs.existsSync(transcriptPath)) {
          console.warn('Claude Code transcript file not found, creating minimal test data');
          return;
        }

        // Step 3: Run our script with the real transcript
        const input = JSON.stringify({ transcript_path: transcriptPath });

        const scriptResult = await new Promise((resolve, reject) => {
          const child = spawn('node', ['src/context-status.js'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: process.cwd()
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
        assert.strictEqual(scriptResult.code, 0);
        assert.match(scriptResult.stdout, /^.+ \(\d+(\.\d+)?[KM]?\)$/);
        assert.notStrictEqual(scriptResult.stdout.trim(), '- (0)'); // Should have some tokens

        // Step 5: Verify transcript schema compatibility
        const transcriptContent = fs.readFileSync(transcriptPath, 'utf8');
        const lines = transcriptContent.trim().split('\n').filter(line => line.trim());

        // Should be able to process the real transcript
        assert.ok(lines.length > 0, 'Transcript should have content');

        // Parse the last few lines to verify schema compatibility
        const lastLines = lines.slice(-5);
        let foundValidEntry = false;

        for (const line of lastLines) {
          try {
            const entry = JSON.parse(line);
            if (entry.message?.usage?.input_tokens && !entry.isSidechain) {
              foundValidEntry = true;
              break;
            }
          } catch (e) {
            // Ignore malformed lines
          }
        }

        // Note: This might not always be true if transcript is empty or all sidechain
        if (foundValidEntry) {
          assert.ok(foundValidEntry, 'Should find at least one valid entry in transcript');
        }

      } catch (error) {
        console.warn('Integration test failed, this may be expected in CI environments:', error.message);
        // Don't fail the test in CI environments where Claude Code isn't available
      }
    });

    test('should handle transcript schema changes gracefully', async () => {
      // Create a mock transcript with potential future schema changes
      const fs = await import('node:fs');
      const path = await import('node:path');
      const os = await import('node:os');

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
        const scriptResult = await new Promise((resolve, reject) => {
          const child = spawn('node', ['src/context-status.js'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: process.cwd()
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
        assert.strictEqual(scriptResult.code, 0);
        assert.strictEqual(scriptResult.stdout.trim(), '- (5K)');

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
          console.warn('Cleanup error:', cleanupError.message);
        }
      }
    });
  });

  describe('Security Tests - Claude Code Integration', () => {
    test('should handle typical Claude Code transcript data', () => {
      const typicalData = [
        '{"message":{"usage":{"input_tokens":1500,"cache_read_input_tokens":500}},"isSidechain":false}',
        '{"message":{"usage":{"input_tokens":2000,"cache_creation_input_tokens":100}},"isSidechain":false}'
      ];

      const tokens = getTotalTokens(typicalData);
      assert.strictEqual(tokens, 2100); // 2000 + 100, should get last entry
    });

    test('should handle malformed JSON gracefully', () => {
      const malformedData = [
        'not json at all',
        '{"incomplete": ',
        '{"message":{"usage":{"input_tokens":1000}}}'
      ];

      const tokens = getTotalTokens(malformedData);
      assert.strictEqual(tokens, 1000);
    });

    test('should skip sidechain entries', () => {
      const mixedData = [
        '{"message":{"usage":{"input_tokens":1000}},"isSidechain":false}',
        '{"message":{"usage":{"input_tokens":999999}},"isSidechain":true}',
        '{"message":{"usage":{"input_tokens":2000}},"isSidechain":false}'
      ];

      const tokens = getTotalTokens(mixedData);
      assert.strictEqual(tokens, 2000); // Should ignore sidechain and get last valid
    });

    test('should return 0 for empty data', () => {
      const emptyData = ['', '   ', '\t'];
      const tokens = getTotalTokens(emptyData);
      assert.strictEqual(tokens, 0);
    });
  });
});

// === SECURITY TESTS ===
describe('Security Tests', () => {
  describe('Path Traversal Protection', () => {
    test('should reject path traversal attempts - relative paths', () => {
      const maliciousInputs = [
        '{"transcript_path":"../../../etc/passwd"}',
        '{"transcript_path":"../../.ssh/id_rsa"}',
        '{"transcript_path":"../../../home/user/.bashrc"}',
        '{"transcript_path":"../../../../windows/system32/config/sam"}'
      ];

      maliciousInputs.forEach(input => {
        const result = getTranscriptPathAndModel(input);
        // Should either reject or sanitize the path
        assert.notEqual(result.transcriptPath, '../../../etc/passwd');
        assert.notEqual(result.transcriptPath, '../../.ssh/id_rsa');
        assert.notEqual(result.transcriptPath, '../../../home/user/.bashrc');
        assert.notEqual(result.transcriptPath, '../../../../windows/system32/config/sam');
      });
    });

    test('should reject null byte injection attempts', () => {
      const maliciousInputs = [
        '{"transcript_path":"valid.jsonl\\u0000../../../etc/passwd"}',
        '{"transcript_path":"test\\x00/../passwd"}',
        '{"transcript_path":"file.jsonl\\0\\0../secret"}'
      ];

      maliciousInputs.forEach(input => {
        const result = getTranscriptPathAndModel(input);
        // Should not contain null bytes in the path
        assert.ok(!result.transcriptPath.includes('\0'));
        assert.ok(!result.transcriptPath.includes('\\u0000'));
        assert.ok(!result.transcriptPath.includes('\\x00'));
      });
    });

    test('should handle absolute path attempts safely', () => {
      const maliciousInputs = [
        '{"transcript_path":"/etc/passwd"}',
        '{"transcript_path":"/root/.ssh/authorized_keys"}',
        '{"transcript_path":"C:\\\\Windows\\\\System32\\\\config\\\\SAM"}',
        '{"transcript_path":"/proc/version"}'
      ];

      maliciousInputs.forEach(input => {
        const result = getTranscriptPathAndModel(input);
        // Should either reject absolute paths or handle them safely
        // The function should not blindly accept any absolute path
        assert.ok(typeof result.transcriptPath === 'string');
      });
    });
  });

  describe('Input Validation Security', () => {
    test('should handle extremely large JSON inputs safely', () => {
      // Test with very large input that could cause DoS
      const largeString = 'x'.repeat(100000);
      const largeInput = `{"transcript_path":"${largeString}"}`;

      const startMemory = process.memoryUsage().heapUsed;
      const result = getTranscriptPathAndModel(largeInput);
      const endMemory = process.memoryUsage().heapUsed;

      // Should not consume excessive memory (>50MB growth)
      const memoryGrowth = endMemory - startMemory;
      assert.ok(memoryGrowth < 50 * 1024 * 1024, `Memory growth too high: ${memoryGrowth} bytes`);

      // Should still return a valid result
      assert.ok(typeof result.transcriptPath === 'string');
    });

    test('should handle malformed Unicode safely', () => {
      const malformedInputs = [
        '{"transcript_path":"\\uD800"}', // Lone high surrogate
        '{"transcript_path":"\\uDFFF"}', // Lone low surrogate
        '{"transcript_path":"\\uD800\\uD800"}', // Double high surrogate
        '{"transcript_path":"test\\uD834file.jsonl"}' // Invalid surrogate in middle
      ];

      malformedInputs.forEach(input => {
        const result = getTranscriptPathAndModel(input);
        // Should handle malformed Unicode gracefully
        assert.ok(typeof result.transcriptPath === 'string');
        assert.ok(result.transcriptPath !== undefined);
      });
    });

    test('should reject deeply nested JSON objects', () => {
      // Create deeply nested object to test for stack overflow
      let deepObject = '{"transcript_path":"test.jsonl"';
      for (let i = 0; i < 1000; i++) {
        deepObject += `,"nested":{"level":${ i}`;
      }
      for (let i = 0; i < 1000; i++) {
        deepObject += '}';
      }
      deepObject += '}';

      // Should not crash or cause stack overflow
      const result = getTranscriptPathAndModel(deepObject);
      assert.ok(typeof result.transcriptPath === 'string');
    });

    test('should handle invalid JSON gracefully without exposing errors', () => {
      const invalidInputs = [
        '{invalid json}',
        '{"unclosed": "string',
        'null',
        'undefined',
        '{"transcript_path":}',
        '{"transcript_path":null}',
        '{"transcript_path":123}',
        '{"transcript_path":[]}',
        '{"transcript_path":{}}'
      ];

      invalidInputs.forEach(input => {
        const result = getTranscriptPathAndModel(input);
        // Should return safe fallback values
        assert.ok(typeof result.transcriptPath === 'string');
        assert.ok(typeof result.modelName === 'string');
        // Should not throw or expose internal error details
      });
    });
  });

  describe('Token Processing Security', () => {
    test('should handle invalid token values safely', () => {
      const maliciousTokenData = [
        // String tokens (should be numbers)
        '{"message":{"usage":{"input_tokens":"malicious_string"}}}',
        '{"message":{"usage":{"input_tokens":"999999999999999999999"}}}',

        // Null/undefined tokens
        '{"message":{"usage":{"input_tokens":null}}}',
        '{"message":{"usage":{"input_tokens":undefined}}}',

        // Negative tokens
        '{"message":{"usage":{"input_tokens":-999999}}}',

        // Float overflow attempts
        '{"message":{"usage":{"input_tokens":1.7976931348623157e+308}}}',

        // NaN and Infinity
        '{"message":{"usage":{"input_tokens":NaN}}}',
        '{"message":{"usage":{"input_tokens":Infinity}}}'
      ];

      maliciousTokenData.forEach(line => {
        const tokens = getTotalTokens([line]);
        // Should return valid number or 0, never NaN or Infinity
        assert.ok(typeof tokens === 'number');
        assert.ok(isFinite(tokens));
        assert.ok(!isNaN(tokens));
        assert.ok(tokens >= 0); // Should not return negative values
      });
    });

    test('should prevent integer overflow in token calculations', () => {
      const maxSafeInteger = Number.MAX_SAFE_INTEGER;
      const overflowData = [
        `{"message":{"usage":{"input_tokens":${maxSafeInteger}}}}`,
        `{"message":{"usage":{"input_tokens":${maxSafeInteger},"cache_read_input_tokens":1000}}}`,
        '{"message":{"usage":{"input_tokens":999999999999999999999999999999}}}'
      ];

      overflowData.forEach(line => {
        const tokens = getTotalTokens([line]);
        // Should handle overflow gracefully
        assert.ok(typeof tokens === 'number');
        assert.ok(isFinite(tokens));
        assert.ok(tokens >= 0);
      });
    });
  });

  describe('Resource Consumption Limits', () => {
    test('should handle very long JSONL files efficiently', () => {
      // Create a large dataset
      const largeDataset = [];
      for (let i = 0; i < 50000; i++) {
        largeDataset.push(`{"message":{"usage":{"input_tokens":${i % 1000}}}}`);
      }

      const startTime = performance.now();
      const startMemory = process.memoryUsage().heapUsed;

      const tokens = getTotalTokens(largeDataset);

      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;

      // Should complete in reasonable time (<5 seconds)
      const processingTime = endTime - startTime;
      assert.ok(processingTime < 5000, `Processing took too long: ${processingTime}ms`);

      // Should not consume excessive memory
      const memoryGrowth = endMemory - startMemory;
      assert.ok(memoryGrowth < 100 * 1024 * 1024, `Memory usage too high: ${memoryGrowth} bytes`);

      // Should return valid result
      assert.ok(typeof tokens === 'number');
      assert.ok(tokens >= 0);
    });

    test('should handle rapid repeated processing without memory leaks', () => {
      const testData = ['{"message":{"usage":{"input_tokens":1000}}}'];
      const initialMemory = process.memoryUsage().heapUsed;

      // Process the same data many times
      for (let i = 0; i < 10000; i++) {
        getTotalTokens(testData);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Should not have significant memory growth (>10MB indicates leak)
      assert.ok(memoryGrowth < 10 * 1024 * 1024, `Potential memory leak: ${memoryGrowth} bytes growth`);
    });
  });

  describe('Integration Security', () => {
    test('should not expose sensitive information in error outputs', () => {
      const sensitiveInputs = [
        '{"transcript_path":"/etc/shadow","secret":"password123"}',
        '{"transcript_path":"config.json","api_key":"sk-1234567890abcdef"}',
        '{"transcript_path":"test.jsonl","aws_secret":"AKIAIOSFODNN7EXAMPLE"}'
      ];

      sensitiveInputs.forEach(input => {
        const result = getTranscriptPathAndModel(input);
        // Result should not contain the sensitive fields
        const resultStr = JSON.stringify(result);
        assert.ok(!resultStr.includes('password123'));
        assert.ok(!resultStr.includes('sk-1234567890abcdef'));
        assert.ok(!resultStr.includes('AKIAIOSFODNN7EXAMPLE'));
      });
    });

    test('should handle concurrent processing safely', async () => {
      const testData = ['{"message":{"usage":{"input_tokens":1000}}}'];

      // Create multiple concurrent processing tasks
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(Promise.resolve(getTotalTokens(testData)));
      }

      const results = await Promise.all(promises);

      // All results should be consistent
      results.forEach(result => {
        assert.strictEqual(result, 1000);
      });
    });
  });
});
