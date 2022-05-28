import { expect, use } from 'chai';
import { spy } from 'sinon';
import * as sinonChai from 'sinon-chai';

import { ContextManager } from './contextManager';

use(sinonChai);

describe('ContextManager', () => {
  type Prefix = 'prefix';
  interface Properties {
    foo: boolean;
    bar: boolean;
  }
  const prefix: Prefix = 'prefix';
  let setQualifiedValue: <T>(qualifiedName: string, value: T) => void;
  let contextManager: ContextManager<Prefix, Properties>;
  beforeEach(() => {
    setQualifiedValue = spy();
    contextManager = new ContextManager<Prefix, Properties>(prefix, setQualifiedValue);
  });
  const expectSetQualifiedValueToHaveBeenCalledWithPrefixedNameAndValue = <Name extends keyof Properties>(
    name: Name,
    value: Properties[Name]
  ): void => void expect(setQualifiedValue).to.have.been.calledWith(`${prefix}.${name}`, value);
  describe('setValue', () => {
    it('should call setQualifiedValue correctly', () => {
      const fooName = 'foo';
      const fooValue = true;
      contextManager.setValue(fooName, fooValue);
      expectSetQualifiedValueToHaveBeenCalledWithPrefixedNameAndValue(fooName, fooValue);
    });
  });
  describe('setValues', () => {
    it('should call setQualifiedValue correctly', () => {
      const values: Properties = {
        foo: true,
        bar: false,
      };
      contextManager.setValues(values);
      for (const name of Object.keys(values) as (keyof Properties)[]) {
        expectSetQualifiedValueToHaveBeenCalledWithPrefixedNameAndValue(name, values[name]);
      }
    });
  });
});
