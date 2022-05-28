export class PrefixManager {
  constructor(private readonly prefix: string) {}

  hasPrefix(string: string): boolean {
    return string.startsWith(this.prefix);
  }

  addPrefix(string: string): string {
    if (this.hasPrefix(string)) {
      throw new Error('Prefix already added');
    }
    return `${this.prefix}${string}`;
  }

  removePrefix(string: string): string {
    if (!this.hasPrefix(string)) {
      throw new Error('Prefix already removed');
    }
    return string.substring(this.prefix.length);
  }
}
