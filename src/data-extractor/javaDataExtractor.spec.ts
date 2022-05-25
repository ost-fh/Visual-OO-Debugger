import { DebugProtocol } from '@vscode/debugprotocol';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import { JavaDataExtractor } from './javaDataExtractor';
import { PanelViewVariable, PrimitiveValue, VariableReference, VariableRelation } from '../model/panelViewInput';
import * as hash from 'object-hash';

describe('JavaDataExtractor', () => {
  const dataExtractor = new JavaDataExtractor();
  const createVariable = (type?: string, name = 'irrelevant', value = 'irrelevant'): DebugProtocol.Variable => ({
    value,
    variablesReference: 0,
    name,
    type,
  });

  it('nullText is "null"', () => expect(dataExtractor.nullText).to.equal('null'));

  describe('isPrimitiveVariable', () => {
    it('should return true for primitive variables', () => {
      const expectVariableToBePrimitive = (type: string): void =>
        void expect(dataExtractor.isPrimitiveVariable(createVariable(type))).to.be.true;

      const primitiveDataTypes = ['boolean', 'char', 'byte', 'short', 'int', 'long', 'float', 'double'];
      for (const type of primitiveDataTypes) {
        expectVariableToBePrimitive(type);
      }
    });

    it('should return false for non primitive variables', () => {
      const expectVariableToNotBePrimitive = (type?: string): void =>
        void expect(dataExtractor.isPrimitiveVariable(createVariable(type))).to.be.false;

      expectVariableToNotBePrimitive('Object');
      expectVariableToNotBePrimitive('String');
      expectVariableToNotBePrimitive('int[]');
      expectVariableToNotBePrimitive('null');
      expectVariableToNotBePrimitive();
    });
  });

  describe('isPrimitiveArrayVariable', () => {
    it('should return true for primitive variables', () => {
      const expectVariableToBePrimitiveArray = (type: string): void =>
        void expect(dataExtractor.isPrimitiveArrayVariable(createVariable(type))).to.be.true;

      const primitiveArrayDataTypes = ['boolean[]', 'char[]', 'byte[]', 'short[]', 'int[]', 'long[]', 'float[]', 'double[]'];
      for (const type of primitiveArrayDataTypes) {
        expectVariableToBePrimitiveArray(type);
      }
    });

    it('should return false for non primitive variables', () => {
      const expectVariableToNotBePrimitiveArray = (type?: string): void =>
        void expect(dataExtractor.isPrimitiveArrayVariable(createVariable(type))).to.be.false;

      expectVariableToNotBePrimitiveArray('Object[]');
      expectVariableToNotBePrimitiveArray('String[]');
      expectVariableToNotBePrimitiveArray('int');
      expectVariableToNotBePrimitiveArray('null');
      expectVariableToNotBePrimitiveArray();
    });
  });

  describe('isNullVariable', () => {
    it('should return true for null variable', () => expect(dataExtractor.isNullVariable(createVariable('null'))).to.be.true);

    it('should return false for non null variables', () => {
      const expectVariableToNotBeNull = (type?: string): void =>
        void expect(dataExtractor.isNullVariable(createVariable(type))).to.be.false;

      expectVariableToNotBeNull('Object');
      expectVariableToNotBeNull('String[]');
      expectVariableToNotBeNull('int');
      expectVariableToNotBeNull();
    });
  });

  describe('isStringVariable', () => {
    it('should return true for String variable', () => expect(dataExtractor.isStringVariable(createVariable('String'))).to.be.true);

    it('should return false for non String variables', () => {
      const expectVariableToNotBeString = (type?: string): void =>
        void expect(dataExtractor.isStringVariable(createVariable(type))).to.be.false;

      expectVariableToNotBeString('Object');
      expectVariableToNotBeString('String[]');
      expectVariableToNotBeString('int');
      expectVariableToNotBeString('null');
      expectVariableToNotBeString();
    });
  });

  describe('isStringArrayVariable', () => {
    it('should return true for String array variable', () =>
      expect(dataExtractor.isStringArrayVariable(createVariable('String[]'))).to.be.true);

    it('should return false for non String array variables', () => {
      const expectVariableToNotBeStringArray = (type?: string): void =>
        void expect(dataExtractor.isStringArrayVariable(createVariable(type))).to.be.false;

      expectVariableToNotBeStringArray('Object');
      expectVariableToNotBeStringArray('String');
      expectVariableToNotBeStringArray('int');
      expectVariableToNotBeStringArray('null');
      expectVariableToNotBeStringArray();
    });
  });

  it('createPrimitiveVariable', () => {
    const inputVariable = createVariable('int', 'intTest', '9');
    const expected: PanelViewVariable = {
      id: `variable_${hash(inputVariable)}`,
      name: inputVariable.name,
      type: inputVariable.type,
      value: inputVariable.value,
    };
    expect(dataExtractor.createPrimitiveVariable(inputVariable)).to.deep.equal(expected);
  });

  it('createPrimitiveValue', () => {
    const inputVariable = createVariable('int', 'intTest', '9');
    const expected: PrimitiveValue = {
      name: inputVariable.name,
      type: 'int',
      value: inputVariable.value,
    };
    expect(dataExtractor.createPrimitiveValue(inputVariable)).to.deep.equal(expected);
  });

  describe('createVariableId', () => {
    it('should add null_ prefix to null variable', () => {
      const inputVariable = createVariable('null');
      const expected = `null_${hash(inputVariable)}`;
      expect(dataExtractor.createVariableId(inputVariable)).to.equal(expected);
    });

    it('should add object_ prefix to object variable', () => {
      const inputVariable = createVariable('Object');
      const expected = `object_irrelevant`;
      expect(dataExtractor.createVariableId(inputVariable)).to.equal(expected);
    });
  });

  describe('createVariableRelation', () => {
    it('should create variable relation with name', () => {
      const parentId = 'nice';
      const inputVariable = createVariable('int', 'intTest', '9');
      const expected: VariableRelation = {
        parentId,
        relationName: 'intTest',
      };
      expect(dataExtractor.createVariableRelation(parentId, inputVariable)).to.deep.equal(expected);
    });

    it('should create variable relation without name', () => {
      const parentId = 'nice';
      const expected: VariableRelation = {
        parentId,
        relationName: '',
      };
      expect(dataExtractor.createVariableRelation(parentId, undefined)).to.deep.equal(expected);
    });
  });

  describe('createVariableReference', () => {
    it('should create variable reference with name', () => {
      const childId = 'nice';
      const inputVariable = createVariable('int', 'intTest', '9');
      const expected: VariableReference = {
        childId,
        relationName: 'intTest',
      };
      expect(dataExtractor.createVariableReference(childId, inputVariable)).to.deep.equal(expected);
    });

    it('should create variable reference without name', () => {
      const childId = 'nice';
      const expected: VariableReference = {
        childId,
        relationName: '',
      };
      expect(dataExtractor.createVariableReference(childId, undefined)).to.deep.equal(expected);
    });
  });

  it('createVariableEntryForNamedVariable', () => {
    const referencedObjectId = 'nice';
    const inputVariable = createVariable('int', 'intTest', '9');
    const expected: PanelViewVariable = {
      id: `variable_${inputVariable.name}`,
      name: inputVariable.name,
      references: [{ childId: referencedObjectId, relationName: '' }],
    };
    expect(dataExtractor.createVariableEntryForNamedVariable(referencedObjectId, inputVariable)).to.deep.equal(expected);
  });

  it('createArrayString', () => {
    const inputVariables = [
      createVariable('int', '0', '1'),
      createVariable('int', '1', '3'),
      createVariable('int', '2', '3'),
      createVariable('int', '3', '7'),
    ];
    const expected = '[1,3,3,7]';
    expect(dataExtractor.createArrayString(inputVariables)).to.deep.equal(expected);
  });
});
