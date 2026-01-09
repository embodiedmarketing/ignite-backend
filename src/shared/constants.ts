export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    SIGNUP: '/api/auth/signup',
    LOGOUT: '/api/auth/logout',
    USER: '/api/auth/user',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
  },
  WORKBOOK: {
    RESPONSES: '/api/user-responses',
    ANALYZE: '/api/analyze-response',
  },
  MESSAGING: {
    STRATEGIES: '/api/messaging-strategies',
    GENERATE: '/api/generate-messaging-strategy',
  },
  OFFERS: {
    LIST: '/api/offers',
    CREATE: '/api/offers',
    OUTLINE: '/api/generate-offer-outline',
  },
} as const;

export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 128,
} as const;

export const SESSION = {
  TTL: 7 * 24 * 60 * 60 * 1000, 
  NAME: 'connect.sid',
} as const;

export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
} as const;

