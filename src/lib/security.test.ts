/**
 * Security Tests
 * Run: npx tsx src/lib/security.test.ts
 */

import { hasSqlInjection, hasXss, sanitizeString, safeId, safeString, strongPasswordSchema } from './validation';

const testResults: { name: string; passed: boolean; error?: string }[] = [];

function test(name: string, fn: () => boolean) {
  try {
    const passed = fn();
    testResults.push({ name, passed });
    console.log(passed ? '✅' : '❌', name);
  } catch (e) {
    testResults.push({ name, passed: false, error: String(e) });
    console.log('❌', name, '-', e);
  }
}

console.log('\n🔒 Running Security Tests...\n');

// SQL Injection Tests
console.log('--- SQL Injection Detection ---');
test('Detects SELECT injection', () => hasSqlInjection("'; SELECT * FROM users --"));
test('Detects UNION injection', () => hasSqlInjection("1 UNION SELECT password FROM users"));
test('Detects DROP injection', () => hasSqlInjection("1; DROP TABLE users;"));
test('Detects comment injection', () => hasSqlInjection("admin'--"));
test('Detects OR 1=1 injection', () => hasSqlInjection("' OR 1=1 --"));
test('Allows normal text', () => !hasSqlInjection("Hello World"));
test('Allows normal query', () => !hasSqlInjection("search term"));

// XSS Tests
console.log('\n--- XSS Detection ---');
test('Detects script tag', () => hasXss('<script>alert(1)</script>'));
test('Detects javascript: protocol', () => hasXss('javascript:alert(1)'));
test('Detects onclick handler', () => hasXss('<div onclick="alert(1)">'));
test('Detects iframe', () => hasXss('<iframe src="evil.com">'));
test('Allows normal HTML text', () => !hasXss('This is normal text'));
test('Allows angle brackets in text', () => !hasXss('5 < 10 and 10 > 5'));

// Input Sanitization Tests
console.log('\n--- Input Sanitization ---');
test('Removes script tags', () => sanitizeString('<script>') === 'script');
test('Removes quotes', () => sanitizeString('"test"') === 'test');
test('Trims whitespace', () => sanitizeString('  test  ') === 'test');
test('Limits length', () => sanitizeString('a'.repeat(2000)).length <= 1000);

// Safe ID Validation Tests
console.log('\n--- Safe ID Validation ---');
test('Accepts alphanumeric', () => safeId.safeParse('abc123').success);
test('Accepts underscore', () => safeId.safeParse('user_id').success);
test('Accepts hyphen', () => safeId.safeParse('user-id').success);
test('Rejects spaces', () => !safeId.safeParse('user id').success);
test('Rejects special chars', () => !safeId.safeParse("user'; DROP").success);

// Safe String Validation Tests
console.log('\n--- Safe String Validation ---');
const testSafeString = safeString(100);
test('Accepts normal string', () => testSafeString.safeParse('Hello World').success);
test('Rejects SQL injection', () => !testSafeString.safeParse("'; DROP TABLE --").success);
test('Rejects XSS', () => !testSafeString.safeParse('<script>alert(1)</script>').success);
test('Respects max length', () => !testSafeString.safeParse('a'.repeat(101)).success);

// Strong Password Tests
console.log('\n--- Strong Password Validation ---');
test('Accepts strong password', () => strongPasswordSchema.safeParse('MyP@ssw0rd!').success);
test('Rejects short password', () => !strongPasswordSchema.safeParse('Ab1!').success);
test('Rejects no uppercase', () => !strongPasswordSchema.safeParse('myp@ssw0rd!').success);
test('Rejects no lowercase', () => !strongPasswordSchema.safeParse('MYP@SSW0RD!').success);
test('Rejects no number', () => !strongPasswordSchema.safeParse('MyP@ssword!').success);
test('Rejects no special char', () => !strongPasswordSchema.safeParse('MyPassw0rd1').success);
test('Rejects common pattern', () => !strongPasswordSchema.safeParse('MyPassword1!').success);
test('Rejects repeated chars', () => !strongPasswordSchema.safeParse('Aaaa@1234!').success);

// Summary
console.log('\n--- Summary ---');
const passed = testResults.filter(r => r.passed).length;
const failed = testResults.filter(r => !r.passed).length;
console.log(`Total: ${testResults.length} | Passed: ${passed} | Failed: ${failed}`);

if (failed > 0) {
  console.log('\n❌ Some tests failed!');
  process.exit(1);
} else {
  console.log('\n✅ All security tests passed!');
  process.exit(0);
}
