/**
 * Shared TypeScript Types
 * 
 * Additional shared types that can be used by both frontend and backend.
 * Database-related types are in models/schema.ts (exported via @backend/models).
 */

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Pagination types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Common request/response types
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// File upload types
export interface FileUploadResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

