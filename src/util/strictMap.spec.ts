import { StrictMap } from './strictMap';
import { expect } from 'chai';

describe('StrictMap', () => {
  describe('constructor', () => {
    const expectEntriesToBeDeepEqual = <K, V>(strictMap: StrictMap<K, V>, map: Map<K, V>): void =>
      void expect(strictMap.entries()).to.deep.equal(map.entries());
    const expectConstructorToBehaveLikeMapConstructor = <K, V>(entries?: readonly (readonly [K, V])[] | null): void =>
      expectEntriesToBeDeepEqual(new StrictMap(entries), new Map(entries));
    it('should behave like map for omitted entries', () => {
      expectConstructorToBehaveLikeMapConstructor();
    });
    it('should behave like map for null entries', () => {
      expectConstructorToBehaveLikeMapConstructor(null);
    });
    it('should behave like map for entries with distinct keys', () => {
      expectConstructorToBehaveLikeMapConstructor([
        ['a', 1],
        ['b', 2],
      ]);
    });
    it('should reject entries with distinct keys', () => {
      expect(
        () =>
          new StrictMap([
            ['a', 1],
            ['a', 2],
          ])
      ).to.throw();
    });
  });
  describe('methods', () => {
    const initialEntryKey = 'a';
    const initialEntryValue = 1;
    const absentEntryKey = 'b';
    let map: StrictMap<string, number>;
    beforeEach(() => {
      map = new StrictMap<string, number>([[initialEntryKey, initialEntryValue]]);
    });
    describe('delete', () => {
      it('should accept deletion of entries that are present', () => {
        map.delete(initialEntryKey);
        expect(map.has(initialEntryKey)).to.equal(false);
      });
      it('should reject deletion of entries that are absent', () => {
        expect(() => map.delete(absentEntryKey)).to.throw(`Cannot delete entry: No entry found with key '${absentEntryKey}'`);
      });
    });
    describe('get', () => {
      it('should accept retrieval of entries that are present', () => {
        expect(map.get(initialEntryKey)).to.deep.equal(initialEntryValue);
      });
      it('should reject retrieval of entries that are absent', () => {
        expect(() => map.get(absentEntryKey)).to.throw(`Cannot get entry: No entry found with key '${absentEntryKey}'`);
      });
    });
    describe('set', () => {
      const valueToBeSet = 2;
      it('should accept setting of entries that are absent', () => {
        map.set(absentEntryKey, valueToBeSet);
        expect(map.get(absentEntryKey)).to.deep.equal(valueToBeSet);
      });
      it('should reject setting of entries that are present', () => {
        expect(() => map.set(initialEntryKey, valueToBeSet)).to.throw(
          `Cannot set entry: There is already an entry with key '${initialEntryKey}'`
        );
      });
    });
  });
});
