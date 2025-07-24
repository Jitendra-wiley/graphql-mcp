// Legacy serverTools.ts file - now re-exports from organized structure
// This file maintains backward compatibility while the codebase transitions

// Re-export everything from the new organized tools structure
export * from './tools/index.js';

// Default export for backward compatibility
export { default } from './tools/index.js';