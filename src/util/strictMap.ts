export class StrictMap<K, V extends Exclude<unknown, undefined>> extends Map<K, V> {
  delete(key: K): true {
    if (!this.has(key)) {
      throw new Error(`Cannot delete entry: No entry found with key '${String(key)}'`);
    }
    super.delete(key);
    return true;
  }

  get(key: K): V {
    const value = super.get(key);
    if (value === undefined) {
      throw new Error(`Cannot get entry: No entry found with key '${String(key)}'`);
    }
    return value;
  }

  set(key: K, value: V): this {
    if (this.has(key)) {
      throw new Error(`Cannot set entry: There is already an entry with key '${String(key)}'`);
    }
    return super.set(key, value);
  }
}
