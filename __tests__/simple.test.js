import { describe, test, expect } from '@jest/globals';

describe('Simple Tests', () => {
  test('Environment variables should be set for testing', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.CLIENT_ID).toBe('fake-microsoft-client-id-for-testing');
    expect(process.env.GOOGLE_CLIENT_ID).toBe('fake-google-client-id-for-testing');
  });

  test('Basic Jest functionality works', () => {
    const testObj = { name: 'test', value: 42 };
    expect(testObj).toHaveProperty('name');
    expect(testObj.value).toBe(42);
  });

  test('Async functionality works', async () => {
    const asyncFunction = async () => {
      return new Promise(resolve => setTimeout(() => resolve('done'), 10));
    };
    
    const result = await asyncFunction();
    expect(result).toBe('done');
  });
});