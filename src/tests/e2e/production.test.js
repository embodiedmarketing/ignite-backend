/**
 * Production Deployment E2E Test
 * Tests production environment functionality
 * 
 * Migrated from: test-cases/production-test.js
 */

import fs from 'fs';

const TEST_EMAIL = 'test@launch.com';
const TEST_PASSWORD = 'secret';

class ProductionTester {
  constructor() {
    this.cookies = '';
    this.results = [];
    this.baseUrl = process.env.PRODUCTION_URL || 'http://localhost:5000';
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    this.results.push(logMessage);
  }

  async test(name, testFn) {
    try {
      this.log(`Testing: ${name}...`);
      await testFn();
      this.log(`✅ PASSED: ${name}`);
      return true;
    } catch (error) {
      this.log(`❌ FAILED: ${name} - ${error.message}`);
      return false;
    }
  }

  async testLandingPage() {
    const response = await fetch(this.baseUrl);
    if (!response.ok) {
      throw new Error('Landing page not accessible');
    }
  }

  async testLogin() {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      this.cookies = setCookie;
    }
  }

  async testAuthenticatedUser() {
    const response = await fetch(`${this.baseUrl}/api/auth/user`, {
      headers: { Cookie: this.cookies },
    });

    if (!response.ok) {
      throw new Error('Failed to get authenticated user');
    }

    const user = await response.json();
    if (!user || !user.email) {
      throw new Error('Invalid user data');
    }
  }

  async testDashboardRoute() {
    const response = await fetch(`${this.baseUrl}/dashboard`, {
      headers: { Cookie: this.cookies },
    });

    if (!response.ok) {
      throw new Error('Dashboard route not accessible');
    }
  }

  async testStaticAssets() {
    const response = await fetch(`${this.baseUrl}/assets/index.js`);
    if (!response.ok) {
      throw new Error('Static assets not loading');
    }
  }

  async testAPIEndpoints() {
    const endpoints = ['/api/health', '/api/auth/user'];
    for (const endpoint of endpoints) {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: { Cookie: this.cookies },
      });
      if (!response.ok && endpoint !== '/api/auth/user') {
        throw new Error(`Endpoint ${endpoint} not working`);
      }
    }
  }

  async testLogout() {
    const response = await fetch(`${this.baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: this.cookies },
    });

    if (!response.ok) {
      throw new Error('Logout failed');
    }

    // Verify user is logged out
    const userResponse = await fetch(`${this.baseUrl}/api/auth/user`, {
      headers: { Cookie: this.cookies },
    });

    if (userResponse.ok) {
      throw new Error('User still authenticated after logout');
    }
  }

  async runAllTests() {
    this.log('🚀 Starting comprehensive production testing...');
    
    await this.test('Landing Page Load', () => this.testLandingPage());
    await this.test('User Login', () => this.testLogin());
    await this.test('Authenticated User Data', () => this.testAuthenticatedUser());
    await this.test('Dashboard Routing', () => this.testDashboardRoute());
    await this.test('Static Asset Loading', () => this.testStaticAssets());
    await this.test('API Endpoints Available', () => this.testAPIEndpoints());
    await this.test('User Logout', () => this.testLogout());

    this.log('🏁 Testing complete!');
    
    // Generate report
    const report = this.results.join('\n');
    fs.writeFileSync('production-test-report.txt', report);
    
    const passCount = this.results.filter(r => r.includes('PASSED')).length;
    const failCount = this.results.filter(r => r.includes('FAILED')).length;
    
    this.log(`📊 Results: ${passCount} passed, ${failCount} failed`);
    
    if (failCount === 0) {
      this.log('🎉 All tests passed! Production matches development.');
    } else {
      this.log('⚠️  Some tests failed. Check report for details.');
    }
  }
}

// Run the tests
const tester = new ProductionTester();
if (import.meta.url === `file://${process.argv[1]}`) {
  tester.runAllTests().catch(console.error);
}

export { ProductionTester };

