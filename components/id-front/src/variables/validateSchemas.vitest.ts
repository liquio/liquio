import Ajv from 'ajv';
import { describe, expect, it } from 'vitest';

import { legalSchema, personSchema } from './validateSchemas';

const ajv = new Ajv({ allErrors: true });
const validateLegal = ajv.compile(legalSchema);
const validatePerson = ajv.compile(personSchema);

const legal = { companyName: 'Acme', edrpou: '12345678', agreement: true };
const person = {
  last_name: 'Doe',
  first_name: 'John',
  middle_name: 'J',
  ipn: '1234567890',
  agreement: true,
};

describe('legalSchema', () => {
  it('accepts the required fields', () => {
    expect(validateLegal(legal)).toBe(true);
  });

  it('accepts optional phone (12+ chars) and email', () => {
    expect(validateLegal({ ...legal, phone: '380501234567', email: 'a@b.c' })).toBe(true);
  });

  it('rejects a phone shorter than 12 characters', () => {
    expect(validateLegal({ ...legal, phone: '38050' })).toBe(false);
  });

  it('requires companyName, edrpou and agreement', () => {
    expect(validateLegal({})).toBe(false);
    const missing = (validateLegal.errors || []).map((error) => (error.params as { missingProperty: string }).missingProperty);
    expect(missing.sort()).toEqual(['agreement', 'companyName', 'edrpou']);
  });

  it('requires agreement to be exactly true', () => {
    expect(validateLegal({ ...legal, agreement: false })).toBe(false);
  });

  // Preserved: the schema has no `type: 'object'` and no `additionalProperties: false`.
  it('lets unknown fields and non-object data through', () => {
    expect(validateLegal({ ...legal, extra: 1 })).toBe(true);
    expect(validateLegal('text')).toBe(true);
  });
});

describe('personSchema', () => {
  it('accepts the required fields', () => {
    expect(validatePerson(person)).toBe(true);
  });

  it('requires the name parts, ipn and agreement', () => {
    expect(validatePerson({})).toBe(false);
    const missing = (validatePerson.errors || []).map((error) => (error.params as { missingProperty: string }).missingProperty);
    expect(missing.sort()).toEqual(['agreement', 'first_name', 'ipn', 'last_name', 'middle_name']);
  });

  it('rejects a short phone and a false agreement', () => {
    expect(validatePerson({ ...person, phone: '123' })).toBe(false);
    expect(validatePerson({ ...person, agreement: false })).toBe(false);
  });

  it('rejects a non-string ipn', () => {
    expect(validatePerson({ ...person, ipn: 1234567890 })).toBe(false);
  });
});
