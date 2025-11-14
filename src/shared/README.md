# Shared Code

This directory contains code shared between backend and frontend.

## Structure

```
backend/src/shared/
├── index.ts          # Re-exports from root shared + backend utilities
├── types.ts          # Shared TypeScript types
├── constants.ts      # Shared constants
└── README.md         # This file
```

## Root Shared Folder

The actual `shared/` folder is at the project root level (`project-root/shared/`) to allow both frontend and backend to access it. This `backend/src/shared/` directory contains backend-specific shared utilities and re-exports.

## Usage

### Import from Root Shared (Recommended)
```typescript
// Import schema directly from root shared folder
import { users, User, InsertUser } from "@shared/schema";
```

### Import via Backend Shared Index
```typescript
// Import from backend shared index (includes types and constants)
import { users, User, ApiResponse, API_ENDPOINTS } from "@backend/shared";
```

### Import Specific Files
```typescript
// Import only types
import type { ApiResponse, PaginatedResponse } from "@backend/shared/types";

// Import only constants
import { API_ENDPOINTS, VALIDATION } from "@backend/shared/constants";
```

## Files

### `index.ts`
Re-exports from root shared schema and backend-specific utilities.

### `types.ts`
Shared TypeScript types:
- `ApiResponse<T>` - Standard API response type
- `PaginatedResponse<T>` - Paginated API response
- `PaginationParams` - Pagination query parameters
- `FileUploadResult` - File upload result type
- `ApiError` - API error type

### `constants.ts`
Shared constants:
- `API_ENDPOINTS` - API endpoint paths
- `VALIDATION` - Validation rules (email regex, password length, etc.)
- `SESSION` - Session configuration
- `FILE_UPLOAD` - File upload limits and allowed types

## Path Aliases

Configured in `tsconfig.json`:
- `@shared/*` → `./shared/*` (root level)
- `@backend/shared/*` → `./backend/src/shared/*`

## Best Practices

1. ✅ Use `@shared/schema` for database schema imports
2. ✅ Use `@backend/shared` for backend-specific shared utilities
3. ✅ Keep root `shared/` folder for cross-platform code
4. ✅ Add new shared types to `types.ts`
5. ✅ Add new shared constants to `constants.ts`
