import { generatePinCode, generateRandomBase36, shortenStringWithPrefixSuffix, validateEmail, Helpers } from './helpers';

describe('validateEmail', () => {
  const validEmails: string[] = [
    'test@example.com',
    'user.name+tag+sorting@example.com',
    'user_name@example.co.uk',
    'user-name@sub.example.com',
    'user123@domain.org',
    'firstname.lastname@example.com',
    'email@[123.123.123.123]',
    '1234567890@example.com',
    'email@example-one.com',
    'username@domain.toolongtld',
    'username@-domain.com',
    'username@domain-.com',
  ];

  validEmails.forEach((email) => {
    it(`should return true for valid email: ${email}`, () => {
      expect(validateEmail(email)).toBe(true);
    });
  });

  const invalidEmails: string[] = [
    'email@123.123.123.123',
    'plainaddress',
    '@missingusername.com',
    'username@.com.my',
    'username123@.com',
    'username@domain_.com',
    'username123@.com.com',
    '.username@domain.com',
    'username@domain..com',
    'username@domain,com',
    'username@domain@domain.com',
    'username@domain..domain.com',
    'username@.domain.com',
    'username@domain.com.',
    'username@domain.c',
    'username@domain..com',
    'username@domain..subdomain.com',
    'username@.domain..com',
    'username@domain..com.',
    'username@domain..com..',
  ];

  invalidEmails.forEach((email) => {
    it(`should return false for invalid email: ${email}`, () => {
      expect(validateEmail(email)).toBe(false);
    });
  });
});

describe('generatePinCode', () => {
  const lengths = [4, 6, 8];

  lengths.forEach((length) => {
    it(`should generate a pin code of the specified length: ${length}`, async () => {
      const pinCode = generatePinCode(length);

      // Check if the pin code has the correct length
      expect(pinCode).toHaveLength(length);

      // Check if the pin code consists only of digits
      expect(/^\d+$/.test(pinCode)).toBe(true);
    });
  });
});

describe('generateRandomBase36', () => {
  const lengths = [4, 6, 8, 10, 12];

  lengths.forEach((length) => {
    it(`should generate a random base36 string of the specified length: ${length}`, () => {
      const generatedStrings = new Set<string>();

      // Generate 10 random base36 strings of the specified length
      for (let i = 0; i < 10; i++) {
        const base36String = generateRandomBase36(length);

        // Check if the base36 string has the correct length
        expect(base36String).toHaveLength(length);

        // Check if the base36 string consists only of valid base36 characters
        expect(/^[0-9a-z]+$/.test(base36String)).toBe(true);

        // Check if the base36 string is unique
        expect(generatedStrings.has(base36String)).toBe(false);

        // Add the string to the set
        generatedStrings.add(base36String);
      }
    });
  });
});

describe('shortenStringWithPrefixSuffix', () => {
  it('should shorten a string with prefix and suffix', () => {
    const str = 'abcdefghijklmnopqrstuvwxyz';
    const shortened = shortenStringWithPrefixSuffix(str, 4, 4);
    expect(shortened).toBe('abcd…wxyz');
  });

  it('should use default prefix and suffix lengths if not provided', () => {
    const str = 'abcdefghijklmnopqrstuvwxyz';
    const shortened = shortenStringWithPrefixSuffix(str);
    expect(shortened).toBe('abcd…wxyz');
  });

  it('should return the original string if it is shorter than the combined prefix and suffix length', () => {
    const str = 'abc';
    const shortened = shortenStringWithPrefixSuffix(str, 4, 4);
    expect(shortened).toBe(str);
  });

  it('should handle empty strings', () => {
    const str = '';
    const shortened = shortenStringWithPrefixSuffix(str, 4, 4);
    expect(shortened).toBe(str);
  });

  it('should treat non-string inputs as empty strings', () => {
    const str = null as unknown as string;
    const shortened = shortenStringWithPrefixSuffix(str, 4, 4);
    expect(shortened).toBe('');
  });
});

describe('shorten', () => {
  it('should shorten a string to the specified length', () => {
    const str = 'abcdefghijklmnopqrstuvwxyz';
    const shortened = Helpers.shorten(str, 10);
    expect(shortened).toBe('abcdefghi…');
  });

  it('should return the original string if it is shorter than the specified length', () => {
    const str = 'short';
    const shortened = Helpers.shorten(str, 10);
    expect(shortened).toBe(str);
  });

  it('should handle empty strings', () => {
    const str = '';
    const shortened = Helpers.shorten(str, 10);
    expect(shortened).toBe(str);
  });

  it('should throw an error for non-string inputs', () => {
    expect(() => Helpers.shorten(null as unknown as string, 10)).toThrow(TypeError);
  });
});
