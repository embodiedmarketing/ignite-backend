/**
 * Shared Code Index
 *
 * Re-exports from root shared folder and backend-specific shared utilities
 * The actual shared folder is at project root to allow both
 * frontend and backend access.
 */

// Re-export schema from root shared folder
export * from "./schema";

// Export backend-specific shared utilities
export * from "./types";
export * from "./constants";
