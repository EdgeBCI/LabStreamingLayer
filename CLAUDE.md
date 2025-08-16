# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

**Build TypeScript to JavaScript:**
```bash
cd node-labstreaminglayer
npm run build
```

**Run tests (after building):**
```bash
cd node-labstreaminglayer
npm test
```

**Clean build artifacts:**
```bash
cd node-labstreaminglayer
npm run clean
```

**Run example scripts (after building):**
```bash
cd node-labstreaminglayer
npm run example:send        # Stream multi-channel data
npm run example:receive     # Receive and display data
npm run example:metadata    # Work with stream metadata
npm run example:send-chunks      # Send data in chunks
npm run example:receive-chunks   # Receive data in chunks
npm run example:performance      # Performance comparison
```

**Development workflow:**
```bash
cd node-labstreaminglayer
npm run clean && npm run build && npm test
```

## Architecture Overview

This repository contains Node.js bindings for Lab Streaming Layer (LSL), a system for unified collection of measurement time series in research experiments. The architecture consists of:

### Core Components

1. **FFI Binding Layer** (`src/lib/index.ts`):
   - Uses Koffi for Foreign Function Interface to LSL C library
   - Provides low-level function bindings and type mappings
   - Handles platform-specific library loading (Windows/macOS/Linux)
   - Maps channel formats to type-specific push/pull functions
   - Special handling for Electron ASAR packaging environments

2. **High-Level API Classes**:
   - `StreamInfo` (`src/streamInfo.ts`): Stream metadata container with XML support
   - `StreamOutlet` (`src/outlet.ts`): Broadcasts data to network
   - `StreamInlet` (`src/inlet.ts`): Receives data from network
   - `XMLElement`: Nested metadata handling for complex stream descriptions
   - Resolver functions (`src/resolver.ts`): Stream discovery with filtering support

3. **Memory Management**:
   - Uses FinalizationRegistry for automatic cleanup of native resources
   - Pre-allocated buffers for efficient chunk operations
   - Proper cleanup of C strings to prevent memory leaks
   - Buffer reuse pattern for high-frequency data streaming

4. **Type System**:
   - Supports all LSL data types: float32, double64, string, int32, int16, int8, int64
   - Dynamic function selection based on channel format
   - TypeScript definitions for full type safety
   - Strict TypeScript configuration with all checks enabled

### Native Libraries

Pre-compiled LSL libraries are located in `prebuild/`:
- Windows: `lsl_amd64.dll` (x64), `lsl_i386.dll` (x86)
- macOS: `liblsl.dylib` (universal binary for Intel/ARM)
- Linux: `liblsl.so`

The library automatically selects the correct binary based on platform and architecture at runtime.

### Key Design Patterns

- **Opaque Pointers**: C structures are handled as opaque pointers through Koffi
- **Type-Specific Functions**: Separate FFI functions for each data type to optimize performance
- **Buffer Reuse**: Pre-allocated buffers minimize allocation overhead in hot paths
- **Automatic Resource Management**: FinalizationRegistry ensures native resources are freed
- **Error Handling**: Custom error types (TimeoutError, LostError, InvalidArgumentError, InternalError)

## Important Considerations

- The package uses ES modules (`"type": "module"` in package.json)
- TypeScript target is ES2022 with strict mode enabled
- Tests use Node.js built-in test runner with `--test-concurrency=1` for reliable LSL operations
- Library loading is handled differently for Electron environments (ASAR compatibility)
- All file paths in the codebase should use forward slashes for cross-platform compatibility