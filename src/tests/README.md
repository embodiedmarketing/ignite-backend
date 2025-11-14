# Backend Tests

This directory contains all test files organized by category.

## Test Structure

```
backend/src/tests/
├── unit/              # Unit tests for individual functions/classes
├── integration/       # Integration tests for API endpoints
├── e2e/              # End-to-end tests
├── services/         # Service-specific tests
├── controllers/      # Controller tests
└── utils/            # Utility function tests
```

## Test Categories

### Integration Tests
- API endpoint tests
- Database integration tests
- Service integration tests

### E2E Tests
- Full workflow tests
- User acceptance tests
- Production deployment tests

### Unit Tests
- Individual function tests
- Utility function tests
- Service method tests

## Running Tests

```bash
# Run all tests
npm test

# Run specific test category
npm test -- integration
npm test -- e2e
npm test -- unit

# Run with coverage
npm test -- --coverage
```

## Test Files Migration

All test files from `test-cases/` directory have been organized into:
- `integration/` - API and database tests
- `e2e/` - End-to-end and production tests
- `services/` - Service-specific tests

