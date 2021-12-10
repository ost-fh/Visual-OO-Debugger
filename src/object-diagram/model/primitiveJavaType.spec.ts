import { expect } from 'chai';
import { isPrimitiveJavaType, PrimitiveJavaType } from './primitiveJavaType';

const itShouldAcceptType = (type: string): void =>
  void it(`should accept type ${type}`, () => void expect(isPrimitiveJavaType(type)).to.equal(true));

const itShouldRejectType = (type: string): void =>
  void it(`should reject type ${type}`, () => void expect(isPrimitiveJavaType(type)).to.equal(false));

const capitalizeString = (string: string): string => string.charAt(0).toUpperCase() + string.slice(1);

describe('PrimitiveJavaType', () => {
  describe('isPrimitiveJavaType', () => {
    describe('Primitive Java types', () => {
      for (const type in PrimitiveJavaType) {
        itShouldAcceptType(type);
      }
    });
    describe('Boxed Java types', () => {
      for (const type of ['Byte', 'Short', 'Integer', 'Long', 'Float', 'Double', 'Boolean', 'Character']) {
        itShouldRejectType(capitalizeString(type));
      }
    });
    describe('Arrays of primitive Java types', () => {
      for (const type in PrimitiveJavaType) {
        itShouldRejectType(`${type}[]`);
      }
    });
  });
});
