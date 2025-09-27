import Benchmark from 'benchmark';
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

  describe('Token Processing Performance', () => {
    test('getTotalTokens should handle small datasets efficiently', (done) => {
      const smallLines = createTestLines(50);
      const suite = new Benchmark.Suite();

      suite
        .add('getTotalTokens - small dataset (50 entries)', () => {
          getTotalTokens(smallLines);
        })
        .on('cycle', (event) => {
          const benchmark = event.target;
          expect(benchmark.hz).toBeGreaterThan(10); // Should process >10 times per second
        })
        .on('complete', () => {
          done();
        })
        .run();
    });

    test('getTotalTokens should handle medium datasets efficiently', (done) => {
      const mediumLines = createTestLines(1000);
      const suite = new Benchmark.Suite();

      suite
        .add('getTotalTokens - medium dataset (1000 entries)', () => {
          getTotalTokens(mediumLines);
        })
        .on('cycle', (event) => {
          const benchmark = event.target;
          expect(benchmark.hz).toBeGreaterThan(5); // Should process >5 times per second
        })
        .on('complete', () => {
          done();
        })
        .run();
    });

    test('getTotalTokens should handle large datasets efficiently', (done) => {
      const largeLines = createTestLines(10000);
      const suite = new Benchmark.Suite();

      suite
        .add('getTotalTokens - large dataset (10000 entries)', () => {
          getTotalTokens(largeLines);
        })
        .on('cycle', (event) => {
          const benchmark = event.target;
          expect(benchmark.hz).toBeGreaterThan(1); // Should process >1 time per second
        })
        .on('complete', () => {
          done();
        })
        .run();
    });
  });

  describe('Formatting Performance', () => {
    test('formatStatusLine should be fast for various token counts', (done) => {
      const tokenCounts = [0, 500, 1000, 1500, 125000, 125400, 1000000, 1500000];
      let index = 0;

      const suite = new Benchmark.Suite();

      suite
        .add('formatStatusLine performance', () => {
          const tokens = tokenCounts[index % tokenCounts.length];
          index++;
          formatStatusLine(tokens);
        })
        .on('cycle', (event) => {
          const benchmark = event.target;
          expect(benchmark.hz).toBeGreaterThan(50000); // Should format >50k times per second
        })
        .on('complete', () => {
          done();
        })
        .run();
    });
  });

  describe('Memory Usage', () => {
    test('should not cause significant memory growth', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const testLines = createTestLines(1000);

      // Process multiple times to test for memory leaks
      for (let i = 0; i < 100; i++) {
        getTotalTokens(testLines);
        formatStatusLine(1000 + i);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Should not grow more than 10MB during processing
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Edge Case Performance', () => {
    test('should handle malformed JSON efficiently', (done) => {
      const mixedLines = [
        ...createTestLines(100),
        'invalid json line 1',
        '{"incomplete": json',
        'another bad line',
        ...createTestLines(100),
        'more invalid json',
        ...createTestLines(100)
      ];

      const suite = new Benchmark.Suite();

      suite
        .add('getTotalTokens with malformed data', () => {
          getTotalTokens(mixedLines);
        })
        .on('cycle', (event) => {
          const benchmark = event.target;
          expect(benchmark.hz).toBeGreaterThan(5); // Should still be reasonably fast
        })
        .on('complete', () => {
          done();
        })
        .run();
    });

    test('should handle empty and whitespace lines efficiently', (done) => {
      const emptyLines = ['', '   ', '\t\n', '  \n  ', ...createTestLines(100)];

      const suite = new Benchmark.Suite();

      suite
        .add('getTotalTokens with empty lines', () => {
          getTotalTokens(emptyLines);
        })
        .on('cycle', (event) => {
          const benchmark = event.target;
          expect(benchmark.hz).toBeGreaterThan(10);
        })
        .on('complete', () => {
          done();
        })
        .run();
    });
  });
});