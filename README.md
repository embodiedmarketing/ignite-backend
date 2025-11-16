# Launch Platform Backend

Independent backend API server for the Launch Platform.

## Structure

```
backend/
├── src/
│   ├── config/        # Configuration (database, environment)
│   ├── controllers/   # Request handlers
│   ├── routes/        # Route definitions
│   ├── services/      # Business logic services
│   ├── middlewares/   # Express middlewares
│   ├── models/        # Data models and schemas
│   ├── utils/         # Utility functions
│   └── server.ts      # Server entry point
├── package.json       # Backend dependencies
└── tsconfig.json      # TypeScript configuration
```

## Installation

```bash
cd backend
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Production

```bash
npm start
```

## Environment Variables

Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL=your_database_url
SESSION_SECRET=your_session_secret
OPENAI_API_KEY=your_openai_key
STRIPE_SECRET_KEY=your_stripe_secret
SENDGRID_API_KEY=your_sendgrid_key
PORT=5000
NODE_ENV=development
```

## Dependencies

All backend dependencies are listed in `backend/package.json`. The backend is fully independent and does not rely on the root `package.json`.
