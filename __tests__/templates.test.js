import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { 
  generateSuccessPage, 
  generateErrorPage, 
  generateNotAvailablePage 
} from '../utils/templates.js';

describe('Templates Tests', () => {
  describe('generateSuccessPage', () => {
    test('should generate success page with complete user data', () => {
      const userData = {
        sub: 'user-123',
        name: 'John Doe',
        email: 'john.doe@example.com',
        picture: 'https://example.com/avatar.jpg',
        given_name: 'John',
        family_name: 'Doe'
      };

      const result = generateSuccessPage(userData);

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('Authentication Successful');
      expect(result).toContain('John Doe');
      expect(result).toContain('john.doe@example.com');
      expect(result).toContain('user-123');
      expect(result).toContain('https://example.com/avatar.jpg');
    });

    test('should handle user data with minimal fields', () => {
      const userData = {
        sub: 'user-456',
        email: 'minimal@example.com'
      };

      const result = generateSuccessPage(userData);

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('Authentication Successful');
      expect(result).toContain('minimal@example.com');
      expect(result).toContain('user-456');
      expect(result).not.toContain('undefined');
    });

    test('should handle user data with name but no email', () => {
      const userData = {
        sub: 'user-789',
        name: 'Jane Smith'
      };

      const result = generateSuccessPage(userData);

      expect(result).toContain('Jane Smith');
      expect(result).toContain('user-789');
      expect(result).not.toContain('undefined');
    });

    test('should handle empty user data object', () => {
      const userData = {};

      const result = generateSuccessPage(userData);

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('Authentication Successful');
      expect(result).not.toContain('undefined');
      expect(result).not.toThrow;
    });

    test('should handle null/undefined user data', () => {
      expect(() => generateSuccessPage(null)).not.toThrow();
      expect(() => generateSuccessPage(undefined)).not.toThrow();
      
      const resultNull = generateSuccessPage(null);
      const resultUndefined = generateSuccessPage(undefined);
      
      expect(resultNull).toContain('<!DOCTYPE html>');
      expect(resultUndefined).toContain('<!DOCTYPE html>');
    });

    test('should handle user data with Microsoft-specific fields', () => {
      const userData = {
        sub: 'ms-user-123',
        name: 'Microsoft User',
        email: 'msuser@company.com',
        oid: 'object-id-123',
        userPrincipalName: 'msuser@company.onmicrosoft.com',
        displayName: 'Microsoft Display Name'
      };

      const result = generateSuccessPage(userData);

      expect(result).toContain('Microsoft User');
      expect(result).toContain('msuser@company.com');
      expect(result).toContain('ms-user-123');
    });

    test('should handle user data with Google-specific fields', () => {
      const userData = {
        sub: 'google-user-456',
        name: 'Google User',
        email: 'googleuser@gmail.com',
        picture: 'https://lh3.googleusercontent.com/avatar.jpg',
        given_name: 'Google',
        family_name: 'User',
        locale: 'en'
      };

      const result = generateSuccessPage(userData);

      expect(result).toContain('Google User');
      expect(result).toContain('googleuser@gmail.com');
      expect(result).toContain('google-user-456');
      expect(result).toContain('https://lh3.googleusercontent.com/avatar.jpg');
    });

    test('should generate valid HTML structure', () => {
      const userData = {
        sub: 'test-user',
        name: 'Test User',
        email: 'test@example.com'
      };

      const result = generateSuccessPage(userData);

      // Check for proper HTML structure
      expect(result).toMatch(/<!DOCTYPE html>/);
      expect(result).toMatch(/<html[^>]*>/);
      expect(result).toMatch(/<head[^>]*>/);
      expect(result).toMatch(/<title[^>]*>/);
      expect(result).toMatch(/<body[^>]*>/);
      expect(result).toMatch(/<\/html>/);
      
      // Check for CSS styles
      expect(result).toContain('<style>');
      expect(result).toContain('</style>');
    });

    test('should escape HTML in user data to prevent XSS', () => {
      const userData = {
        sub: 'xss-test',
        name: '<script>alert("xss")</script>',
        email: 'test@example.com"><script>alert("xss")</script>'
      };

      const result = generateSuccessPage(userData);

      // Should not contain unescaped script tags
      expect(result).not.toContain('<script>alert("xss")</script>');
      // Should contain escaped content or safe handling
      expect(result).toContain('&lt;script&gt;') || expect(result).not.toContain('<script>');
    });
  });

  describe('generateErrorPage', () => {
    test('should generate error page with title and message', () => {
      const title = 'Authentication Error';
      const message = 'Invalid credentials provided';

      const result = generateErrorPage(title, message);

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('Authentication Error');
      expect(result).toContain('Invalid credentials provided');
      expect(result).toContain('message-box error');
    });

    test('should handle empty title and message', () => {
      const result = generateErrorPage('', '');

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).not.toContain('undefined');
    });

    test('should handle null/undefined parameters', () => {
      expect(() => generateErrorPage(null, null)).not.toThrow();
      expect(() => generateErrorPage(undefined, undefined)).not.toThrow();
      
      const result = generateErrorPage(null, undefined);
      expect(result).toContain('<!DOCTYPE html>');
    });

    test('should generate different error types', () => {
      const oauthError = generateErrorPage('OAuth Error', 'access_denied: User denied access');
      const authError = generateErrorPage('Authentication Error', 'Failed to complete authentication');
      const templateError = generateErrorPage('Template Error', 'Failed to generate success page');

      expect(oauthError).toContain('OAuth Error');
      expect(oauthError).toContain('access_denied');
      
      expect(authError).toContain('Authentication Error');
      expect(authError).toContain('Failed to complete');
      
      expect(templateError).toContain('Template Error');
      expect(templateError).toContain('Failed to generate');
    });

    test('should generate valid HTML structure', () => {
      const result = generateErrorPage('Test Error', 'Test message');

      expect(result).toMatch(/<!DOCTYPE html>/);
      expect(result).toMatch(/<html[^>]*>/);
      expect(result).toMatch(/<head[^>]*>/);
      expect(result).toMatch(/<body[^>]*>/);
      expect(result).toMatch(/<\/html>/);
    });

    test('should include navigation links', () => {
      const result = generateErrorPage('Test Error', 'Test message');

      expect(result).toContain('href="/"');
      expect(result).toContain('Back to Monster Energy Portal');
    });

    test('should escape HTML in error messages to prevent XSS', () => {
      const title = '<script>alert("xss")</script>';
      const message = 'Error: <img src=x onerror=alert("xss")>';

      const result = generateErrorPage(title, message);

      // Should not contain unescaped script tags
      expect(result).not.toContain('<script>alert("xss")</script>');
      expect(result).not.toContain('<img src=x onerror=alert("xss")>');
      
      // Should contain escaped content
      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('&lt;img src=x onerror=alert');
    });
  });

  describe('generateNotAvailablePage', () => {
    test('should generate not available page for Microsoft', () => {
      const result = generateNotAvailablePage('microsoft');

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('Microsoft');
      expect(result).toContain('not configured');
    });

    test('should generate not available page for Google', () => {
      const result = generateNotAvailablePage('google');

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('Google');
      expect(result).toContain('not configured');
    });

    test('should handle unknown provider with proper capitalization', () => {
      const result = generateNotAvailablePage('unknown-provider');

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('Unknown-Provider'); // Each word capitalized
      expect(result).toContain('UNKNOWN_PROVIDER_CLIENT_ID'); // Underscores, not hyphens
      expect(result).not.toContain('undefined');
    });

    test('should handle provider names with special characters', () => {
      const result = generateNotAvailablePage('test-provider-123');

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('Test-Provider-123'); // Each segment capitalized
      expect(result).toContain('TEST_PROVIDER_123_CLIENT_ID'); // Underscores replace hyphens
      expect(result).not.toContain('undefined');
    });

    test('should handle single word provider names', () => {
      const result = generateNotAvailablePage('facebook');

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('Facebook'); // Capitalized
      expect(result).toContain('FACEBOOK_CLIENT_ID'); // Environment variable
      expect(result).not.toContain('undefined');
    });

    test('should handle complex provider names', () => {
      const result = generateNotAvailablePage('my-custom-auth-provider');

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('My-Custom-Auth-Provider'); // All words capitalized
      expect(result).toContain('MY_CUSTOM_AUTH_PROVIDER_CLIENT_ID'); // Underscores in env vars
      expect(result).not.toContain('undefined');
    });

    test('should handle provider names with underscores', () => {
      const result = generateNotAvailablePage('test_provider_name');

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('Test-Provider-Name'); // Underscores become hyphens in display
      expect(result).toContain('TEST_PROVIDER_NAME_CLIENT_ID'); // Underscores stay in env vars
      expect(result).not.toContain('undefined');
    });

    test('should handle mixed separators', () => {
      const result = generateNotAvailablePage('my-auth_provider service');

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('My-Auth-Provider-Service'); // All separators become hyphens
      expect(result).toContain('MY_AUTH_PROVIDER_SERVICE_CLIENT_ID'); // All become underscores in env
      expect(result).not.toContain('undefined');
    });

    test('should handle empty/null provider', () => {
      expect(() => generateNotAvailablePage('')).not.toThrow();
      expect(() => generateNotAvailablePage(null)).not.toThrow();
      expect(() => generateNotAvailablePage(undefined)).not.toThrow();
      
      const resultEmpty = generateNotAvailablePage('');
      const resultNull = generateNotAvailablePage(null);
      const resultUndefined = generateNotAvailablePage(undefined);
      
      expect(resultEmpty).toContain('Service');
      expect(resultNull).toContain('Service');
      expect(resultUndefined).toContain('Service');
    });

    test('should generate valid HTML structure', () => {
      const result = generateNotAvailablePage('test-provider');

      expect(result).toMatch(/<!DOCTYPE html>/);
      expect(result).toMatch(/<html[^>]*>/);
      expect(result).toMatch(/<head[^>]*>/);
      expect(result).toMatch(/<body[^>]*>/);
      expect(result).toMatch(/<\/html>/);
    });

    test('should include environment variable guidance', () => {
      const result = generateNotAvailablePage('custom-provider');

      // Check for uppercase environment variables with underscores
      expect(result).toContain('CUSTOM_PROVIDER_CLIENT_ID');
      expect(result).toContain('CUSTOM_PROVIDER_CLIENT_SECRET');
      expect(result).toContain('environment variables');
    });

    test('should include helpful information for configuration', () => {
      const result = generateNotAvailablePage('microsoft');

      expect(
        result.includes('configure') || 
        result.includes('environment') || 
        result.includes('MICROSOFT_CLIENT_ID') ||
        result.includes('CLIENT_SECRET')
      ).toBe(true);
    });

    test('should include navigation options', () => {
      const result = generateNotAvailablePage('google');

      expect(
        result.includes('href="/') || 
        result.includes('Back to Portal')
      ).toBe(true);
    });

    test('should have proper warning styling', () => {
      const result = generateNotAvailablePage('test-provider');

      expect(result).toContain('message-box warning');
      expect(result).toContain('⚠️');
    });
  });

  describe('Template Integration', () => {
    test('all templates should have consistent styling', () => {
      const successPage = generateSuccessPage({ name: 'Test User', email: 'test@example.com' });
      const errorPage = generateErrorPage('Test Error', 'Test message');
      const notAvailablePage = generateNotAvailablePage('test-provider');

      // All should have CSS styling
      expect(successPage).toContain('<style>');
      expect(errorPage).toContain('<style>');
      expect(notAvailablePage).toContain('<style>');

      // All should have proper viewport meta tag for mobile
      expect(successPage).toContain('viewport') || expect(successPage).toContain('width=device-width');
      expect(errorPage).toContain('viewport') || expect(errorPage).toContain('width=device-width');
      expect(notAvailablePage).toContain('viewport') || expect(notAvailablePage).toContain('width=device-width');
    });

    test('all templates should be valid HTML5', () => {
      const templates = [
        generateSuccessPage({ name: 'Test User' }),
        generateErrorPage('Test Error', 'Test message'),
        generateNotAvailablePage('test-provider')
      ];

      templates.forEach(template => {
        expect(template).toMatch(/<!DOCTYPE html>/i);
        expect(template).toMatch(/<html[^>]*>/i);
        expect(template).toMatch(/<\/html>/i);
        expect(template).toMatch(/<head[^>]*>/i);
        expect(template).toMatch(/<\/head>/i);
        expect(template).toMatch(/<body[^>]*>/i);
        expect(template).toMatch(/<\/body>/i);
      });
    });

    test('all templates should have security headers meta tags', () => {
      const templates = [
        generateSuccessPage({ name: 'Test User' }),
        generateErrorPage('Test Error', 'Test message'),
        generateNotAvailablePage('test-provider')
      ];

      templates.forEach(template => {
        // Should have charset declaration
        expect(template).toContain('charset=') || expect(template).toContain('UTF-8');
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle very long user data strings', () => {
      const longString = 'A'.repeat(1000);
      const userData = {
        sub: 'test-user',
        name: longString,
        email: 'test@example.com'
      };

      expect(() => generateSuccessPage(userData)).not.toThrow();
      const result = generateSuccessPage(userData);
      expect(result).toContain('<!DOCTYPE html>');
    });

    test('should handle special characters in user data', () => {
      const userData = {
        sub: 'test-user',
        name: 'José María Azañár',
        email: 'josé@example.com'
      };

      expect(() => generateSuccessPage(userData)).not.toThrow();
      const result = generateSuccessPage(userData);
      expect(result).toContain('José María Azañár');
    });

    test('should handle numeric values in user data', () => {
      const userData = {
        sub: 123456,
        name: 'Test User',
        email: 'test@example.com',
        age: 25
      };

      expect(() => generateSuccessPage(userData)).not.toThrow();
      const result = generateSuccessPage(userData);
      expect(result).toContain('123456');
    });

    test('should handle boolean values in user data', () => {
      const userData = {
        sub: 'test-user',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: true,
        isAdmin: false
      };

      expect(() => generateSuccessPage(userData)).not.toThrow();
      const result = generateSuccessPage(userData);
      expect(result).toContain('Test User');
    });
  });
});