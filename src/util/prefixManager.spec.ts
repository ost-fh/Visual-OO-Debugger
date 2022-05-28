import { expect } from 'chai';
import { PrefixManager } from './prefixManager';

describe('PrefixManager', () => {
  const prefix = 'foo_';
  let prefixManager: PrefixManager;
  beforeEach(() => {
    prefixManager = new PrefixManager(prefix);
  });
  describe('hasPrefix', () => {
    it('should recognize the absence of a prefix', () => {
      expect(prefixManager.hasPrefix('bar_baz')).to.be.false;
    });
    it('should recognize the absence of a prefix', () => {
      expect(prefixManager.hasPrefix('foo_bar')).to.be.true;
    });
  });
  describe('addPrefix', () => {
    it('should add a prefix that is not added yet', () => {
      const suffix = `bar`;
      expect(prefixManager.addPrefix(suffix)).to.equal(`${prefix}${suffix}`);
    });
    it('should not add a prefix that is already added', () => {
      expect(() => prefixManager.addPrefix(`${prefix}bar`)).to.throw('Prefix already added');
    });
  });
  describe('removePrefix', () => {
    it('should remove a prefix that is present', () => {
      const suffix = `bar`;
      expect(prefixManager.removePrefix(`${prefix}${suffix}`)).to.equal(suffix);
    });
    it('should not remove a prefix that is absent', () => {
      expect(() => prefixManager.removePrefix('bar')).to.throw('Prefix already removed');
    });
  });
});
