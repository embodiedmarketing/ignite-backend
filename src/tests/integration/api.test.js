/**
 * API Integration Tests
 * Tests API endpoints and their responses
 * 
 * Migrated from: test-cases/test-api-direct.js, simple-api-test.js, direct-api-test.js
 */

class APITester {
  constructor() {
    this.baseUrl = process.env.API_URL || 'http://localhost:5000';
    this.results = [];
  }

  log(message, status = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${status}] ${message}`;
    console.log(logMessage);
    this.results.push(logMessage);
  }

  async testEndpoint(method, endpoint, body = null, headers = {}) {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      const data = await response.json();

      return {
        success: response.ok,
        status: response.status,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async testHealthEndpoint() {
    this.log('Testing /api/health endpoint...');
    const result = await this.testEndpoint('GET', '/api/health');
    
    if (!result.success) {
      throw new Error(`Health check failed: ${result.error || result.status}`);
    }

    if (!result.data || result.data.status !== 'healthy') {
      throw new Error('Health check returned unhealthy status');
    }

    this.log('✅ Health endpoint working');
    return true;
  }

  async testAuthEndpoints() {
    this.log('Testing auth endpoints...');
    
    // Test signup
    const signupResult = await this.testEndpoint('POST', '/api/auth/signup', {
      email: `test${Date.now()}@test.com`,
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'User',
    });

    if (!signupResult.success && signupResult.status !== 400) {
      throw new Error(`Signup failed: ${signupResult.error || signupResult.status}`);
    }

    this.log('✅ Auth endpoints working');
    return true;
  }

  async runAllTests() {
    this.log('Starting API Integration Tests...');
    
    await this.testHealthEndpoint();
    await this.testAuthEndpoints();
    
    this.log('API Integration Tests Complete');
    return true;
  }
}

export { APITester };

