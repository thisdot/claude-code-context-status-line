## Repository Overview

**Purpose:** Restore context window visibility for AWS Bedrock users in Claude Code by displaying token usage in the status line.

**Architecture:** Single-script Node.js project with comprehensive testing and security hardening.

## Package Manager

**IMPORTANT:** This project uses **pnpm**, not npm.

## Project Structure

**Key files:**
- `src/context-status.js` - Main status line script
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

### Threat Model
This tool processes untrusted input (JSONL transcript files and JSON configuration) and must defend against:
- **Path traversal attacks**: Attempts to access files outside intended directories
- **Input sanitization failures**: Malformed JSON, Unicode attacks, null byte injection
- **Resource exhaustion**: Memory/CPU DoS through large inputs
- **Information disclosure**: Leaking sensitive data through error messages

### Security Implementations

#### Input Validation
- **JSON parsing**: Comprehensive error handling with safe fallback values
- **Path sanitization**: Strips control characters, detects traversal patterns
- **Path restrictions**: Blocks access to system directories (`/etc/`, `/root/`, Windows system paths)
- **Token validation**: Ensures numeric values are finite, non-negative integers
- **Memory limits**: Large input protection with configurable thresholds

#### Error Handling
- **No sensitive information exposed**: Error messages sanitized
- **Safe fallback output**: Always returns `- (-)` on any error
- **Security logging**: Suspicious activity logged to stderr (not exposed to status line)
- **Graceful degradation**: Never crashes, always provides safe output

#### File System Security
- **Read-only access**: No file modification capabilities
- **Project directory restriction**: Path validation prevents directory traversal
- **Sandboxed execution**: Designed for Claude Code's secure environment


## ESLint Configuration

Strict security-focused configuration includes:
- No `eval()`, `new Function()`, or similar dangerous patterns
- Strict equality checks (`===`)
- Async/await best practices
- No unused variables or dead code
- Consistent code style for maintainability

## Integration Testing

### Manual Testing
```bash
# Test with valid input
echo '{"transcript_path":"/path/to/actual/transcript.jsonl"}' | node src/context-status.js
# Expected: Model (tokens) or - (-)

# Test security - path traversal (should be blocked)
echo '{"transcript_path":"../../../etc/passwd.jsonl"}' | node src/context-status.js
# Expected: - (-) with security logging to stderr

# Test with Claude Code directly
# 1. Configure status line in ~/.claude/settings.json
# 2. Start conversation in Claude Code
# 3. Verify status line shows token count
```

### Automated Security Testing
```bash
# Run comprehensive security test suite
pnpm test -- --grep "Security Tests"

# Run all tests including security
pnpm run test:all
```

## Version Management

- **Current version:** 0.1.0
- **Semantic versioning:** MAJOR.MINOR.PATCH
- **Breaking changes:** Increment MAJOR
- **New features:** Increment MINOR
- **Bug fixes:** Increment PATCH

## Common Issues

1. **Node.js version:** Ensure using Node.js 18+ for native test runner support
2. **pnpm not found:** Install with `npm install -g pnpm`
3. **Path issues:** Use absolute paths in Claude Code configuration

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

## Missing Critical Sections

### Deployment Guide
- **NPM Publishing**: Use `pnpm run prepublishOnly` to validate before publishing
- **Version Management**: Keep package.json and CLAUDE.md versions synchronized
- **Distribution**: Primary distribution through npm, secondary through GitHub releases

### Configuration Reference
- **Claude Code Integration**: Status line configuration in `~/.claude/settings.json`
- **Environment Variables**: None required (zero-configuration design)
- **Runtime Options**: All configuration through Claude Code's stdin JSON format

### API Documentation
- **Main Functions**: `getTotalTokens()`, `getTranscriptPathAndModel()`, `formatStatusLine()`
- **Input Format**: JSON object with `transcript_path` and optional `model.display_name`
- **Output Format**: String suitable for Claude Code status line display
- **Error Handling**: Always returns safe fallback string, never throws

### Compatibility Matrix
- **Node.js**: 18.x (minimum), 20.x (recommended), 22.x (tested)
- **Claude Code**: All versions with status line support
- **Operating Systems**: macOS, Linux, Windows (with Node.js)

## AI Assistant Notes

- **Security First**: This is a security-hardened project - be extremely cautious with file access and input validation
- **Performance Critical**: The script runs frequently in Claude Code's status line - optimize for speed and memory efficiency
- **Zero Dependencies**: Uses only Node.js built-in modules for security and reliability
- **Package Management**: Always use pnpm, not npm, for this project
- **Architecture**: Single-script design in `src/context-status.js` with comprehensive test coverage
- **Testing Strategy**: Node.js native test runner with security-focused test cases