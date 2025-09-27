## Repository Overview

**Purpose:** Restore context window visibility for AWS Bedrock users in Claude Code by displaying token usage in the status line.

**Architecture:** Single-script Node.js project with comprehensive testing and security hardening.

## Package Manager

**IMPORTANT:** This project uses **pnpm**, not npm.

## Project Structure

**Key files:**
- `src/context-status.js` - Main executable script
- `tests/` - Native Node.js test suite (functionality, security, benchmarks)
- `package.json` - Uses pnpm (not npm)
- `.eslintrc.cjs` - Security-focused linting rules
- `docs/claude-code-status-line.md` - Claude Code integration documentation

## Key Design Decisions

### 1. Build Process
- **No build step required** - single script approach
- Main script lives in src/ directory (`src/context-status.js`)
- Direct execution with Node.js 18+
- Simple src/ structure for better organization

### 2. Testing Strategy
- **Node.js native test runner** (stable since Node.js 20)
- **Three test categories:**
  - Functionality tests (core features)
  - Security tests (Claude Code integration validation)
  - Performance benchmarks (using built-in performance timing)
- **Built-in coverage** with `--experimental-test-coverage` flag

### 3. Performance Features
- **Clean formatting:** Consistent token display across all environments
- **Memory efficient:** Minimal memory footprint for status line updates

## Development Commands

```bash
# Setup
pnpm install

# Development workflow
pnpm test                    # Run core functionality tests
pnpm run test:coverage      # Generate coverage report with native coverage
pnpm run benchmark         # Run performance benchmarks
pnpm run test:all          # Run all tests (functionality + benchmarks)
pnpm run lint               # Check code quality and security
pnpm run lint:fix          # Auto-fix linting issues
```

## Performance Targets

The benchmark suite uses Node.js native `performance.now()` timing to validate:

- **Small datasets (50 entries):** >10 operations/second
- **Medium datasets (1,000 entries):** >5 operations/second
- **Large datasets (10,000 entries):** >1 operation/second
- **Format performance:** >50,000 operations/second
- **Memory usage:** <10MB growth during processing
- **Edge cases:** Efficient handling of malformed JSON and empty lines

## Security Considerations

### Input Validation
- JSON input parsing with error handling
- Basic file path resolution

### Error Handling
- No sensitive information exposed in error messages
- Safe fallback output (`Context: -`) on all errors


## ESLint Configuration

Strict security-focused configuration includes:
- No `eval()`, `new Function()`, or similar dangerous patterns
- Strict equality checks (`===`)
- Async/await best practices
- No unused variables or dead code
- Consistent code style for maintainability

## Integration Testing

```bash
# Test with Claude Code (manual)
echo '{"transcript_path":"/path/to/actual/transcript.jsonl"}' | node src/context-status.js

# Test security (should be blocked)
echo '{"transcript_path":"../../../etc/passwd.jsonl"}' | node src/context-status.js
# Expected: Context: 0 (with security logging to stderr)
```

## Version Management

- **Current version:** 2.0.0
- **Semantic versioning:** MAJOR.MINOR.PATCH
- **Breaking changes:** Increment MAJOR
- **New features:** Increment MINOR
- **Bug fixes:** Increment PATCH

## Common Issues

1. **Node.js version:** Ensure using Node.js 18+ for native test runner support
2. **pnpm not found:** Install with `npm install -g pnpm`
3. **Permission errors:** Ensure `src/context-status.js` is executable (`chmod +x`)
4. **Path issues:** Use absolute paths in Claude Code configuration

## Contributing Guidelines

When making changes:

1. **Run tests first:** `pnpm test`
2. **Check security:** Review any new file access or input handling
3. **Lint code:** `pnpm run lint:fix`
4. **Update tests:** Add tests for new functionality
5. **Performance check:** Run `pnpm run benchmark` if affecting performance
6. **Update docs:** Update this file and README.md as needed

## Debugging Methodology

When tests fail unexpectedly (especially when functions return 0 instead of expected values):

1. **Systematic Layer-by-Layer Debugging:**
   - Add `console.error('[DEBUG]')` logging at each major function entry/exit
   - Trace the exact failure point rather than assuming the problem location
   - Verify inputs, intermediate values, and outputs at each stage

2. **Common Test Issues:**
   - **Newline characters**: Ensure test files use `'\n'` not `'\\n'` for proper JSONL format
   - **File paths**: Verify test files are within security boundaries (project directory)
   - **File content**: Log actual file contents vs expected format during debugging

3. **Isolation Testing:**
   - Create minimal reproduction scripts outside test environment
   - Test core functions with known-good inputs to verify baseline functionality
   - Use single-test execution: `node --test --grep "specific test name"`

4. **Example Debug Session:**
   ```bash
   # Add debug logging to problematic function
   # Run isolated test to see exact failure point
   node --test tests/context-status.test.js
   # Remove debug logging after fix is confirmed
   ```

## AI Assistant Notes

- This is a security-hardened project - be cautious with file access and input validation
- Performance is critical - the script runs frequently in Claude Code's status line
- Native Node.js test runner provides zero-dependency testing with built-in ES module support
- Always use pnpm, not npm, for package management
- The main script must remain at root level for proper package.json bin configuration