import { test, describe } from 'node:test';
import assert from 'node:assert';
import { performance } from 'node:perf_hooks';
import { getTotalTokens, formatStatusLine } from '../src/context-status.js';

describe('Performance Benchmarks', () => {
  // Helper to create test data
  function createTestLines(count = 1000) {
    const lines = [];
    for (let i = 0; i < count; i++) {
      lines.push(JSON.stringify({
        message: {
          usage: {
            input_tokens: 1000 + i,
            cache_read_input_tokens: i % 100,
            cache_creation_input_tokens: i % 50
          }
        },
        isSidechain: false
      }));
    }
    return lines;
  }

  // Helper to measure performance
  function measurePerformance(fn, iterations = 100) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      fn();
    }
    const end = performance.now();
    const totalTime = end - start;
    const averageTime = totalTime / iterations;
    const operationsPerSecond = 1000 / averageTime;

    return {
      totalTime,
      averageTime,
      operationsPerSecond
    };
  }

  describe('Token Processing Performance', () => {
    test('getTotalTokens should handle small datasets efficiently', () => {
      const smallLines = createTestLines(50);

      const results = measurePerformance(() => {
        getTotalTokens(smallLines);
      }, 50);

      console.log(`Small dataset: ${results.operationsPerSecond.toFixed(2)} ops/sec`);
      assert.ok(results.operationsPerSecond > 5, `Should process >5 times per second, got ${results.operationsPerSecond.toFixed(2)}`);
    });

    test('getTotalTokens should handle medium datasets efficiently', () => {
      const mediumLines = createTestLines(1000);

      const results = measurePerformance(() => {
        getTotalTokens(mediumLines);
      }, 20);

      console.log(`Medium dataset: ${results.operationsPerSecond.toFixed(2)} ops/sec`);
      assert.ok(results.operationsPerSecond > 2, `Should process >2 times per second, got ${results.operationsPerSecond.toFixed(2)}`);
    });

    test('getTotalTokens should handle large datasets efficiently', () => {
      const largeLines = createTestLines(10000);

      const results = measurePerformance(() => {
        getTotalTokens(largeLines);
      }, 5);

      console.log(`Large dataset: ${results.operationsPerSecond.toFixed(2)} ops/sec`);
      assert.ok(results.operationsPerSecond > 0.5, `Should process >0.5 times per second, got ${results.operationsPerSecond.toFixed(2)}`);
    });
  });

  describe('Formatting Performance', () => {
    test('formatStatusLine should be fast for various token counts', () => {
      const tokenCounts = [0, 500, 1000, 1500, 125000, 125400, 1000000, 1500000];
      let index = 0;

      const results = measurePerformance(() => {
        const tokens = tokenCounts[index % tokenCounts.length];
        const modelName = 'TestModel';
        index++;
        formatStatusLine(tokens, modelName);
      }, 10000);

      console.log(`Format performance: ${results.operationsPerSecond.toFixed(0)} ops/sec`);
      assert.ok(results.operationsPerSecond > 10000, `Should format >10k times per second, got ${results.operationsPerSecond.toFixed(0)}`);
    });
  });

  describe('Memory Usage', () => {
    test('should not cause significant memory growth', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const testLines = createTestLines(1000);

      // Process multiple times to test for memory leaks
      for (let i = 0; i < 100; i++) {
        getTotalTokens(testLines);
        formatStatusLine(1000 + i, 'TestModel');
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      console.log(`Memory growth: ${(memoryGrowth / (1024 * 1024)).toFixed(2)} MB`);

      // Should not grow more than 10MB during processing
      assert.ok(memoryGrowth < 10 * 1024 * 1024, `Memory growth should be <10MB, was ${(memoryGrowth / (1024 * 1024)).toFixed(2)}MB`);
    });
  });

  describe('Edge Case Performance', () => {
    test('should handle malformed JSON efficiently', () => {
      const mixedLines = [
        ...createTestLines(100),
        'invalid json line 1',
        '{"incomplete": json',
        'another bad line',
        ...createTestLines(100),
        'more invalid json',
        ...createTestLines(100)
      ];

      const results = measurePerformance(() => {
        getTotalTokens(mixedLines);
      }, 20);

      console.log(`Malformed JSON performance: ${results.operationsPerSecond.toFixed(2)} ops/sec`);
      assert.ok(results.operationsPerSecond > 2, `Should still be reasonably fast, got ${results.operationsPerSecond.toFixed(2)} ops/sec`);
    });

    test('should handle empty and whitespace lines efficiently', () => {
      const emptyLines = ['', '   ', '\t\n', '  \n  ', ...createTestLines(100)];

      const results = measurePerformance(() => {
        getTotalTokens(emptyLines);
      }, 50);

      console.log(`Empty lines performance: ${results.operationsPerSecond.toFixed(2)} ops/sec`);
      assert.ok(results.operationsPerSecond > 5, `Should handle empty lines efficiently, got ${results.operationsPerSecond.toFixed(2)} ops/sec`);
    });
  });
});
