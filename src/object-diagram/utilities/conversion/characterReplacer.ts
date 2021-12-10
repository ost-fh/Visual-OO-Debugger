interface Range {
  start: number;
  end: number;
  replace(character: string): string;
}

type Ranges = Range[];

type Replacements = Record<string, string>;

export class CharacterReplacer {
  static fromRanges(ranges: Ranges): CharacterReplacer {
    return new CharacterReplacer(this.createTransformationsByCharacter(ranges), this.createRegExp(ranges));
  }

  private static createTransformationsByCharacter(ranges: Ranges): Replacements {
    const replacements: Replacements = {};
    for (const { start, end, replace } of ranges) {
      for (let charCode = start; charCode < end; charCode++) {
        const character = String.fromCharCode(charCode);
        replacements[character] = replace(character);
      }
    }
    return replacements;
  }

  private static createRegExp(ranges: Ranges): RegExp {
    const characterRangePatterns = ranges.map(({ start, end }) => `${String.fromCharCode(start)}-${String.fromCharCode(end - 1)}`);
    return new RegExp(`[${characterRangePatterns.join('')}]`, 'gm');
  }

  private constructor(private readonly replacements: Replacements, private readonly regExp: RegExp) {}

  replaceCharacters(string: string): string {
    return string.replace(this.regExp, (substring) => {
      const replacement = this.replacements[substring];
      if (replacement === undefined) {
        throw new Error(`No replacement found for '${substring}'`);
      }
      return replacement;
    });
  }
}
