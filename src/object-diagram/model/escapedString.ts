import { CharacterReplacer } from '../utilities/conversion/characterReplacer';
import { Phantom } from '../utilities/typing/phantom';

export type EscapedString = Phantom<
  string,
  {
    readonly _: unique symbol;
  }
>;

const controlCodeReplacer = CharacterReplacer.fromRanges([
  // C0 control codes
  {
    start: 0x00,
    end: 0x20,
    replace: (character): string => {
      const quotedCharacter = JSON.stringify(character);
      return quotedCharacter.slice(1, quotedCharacter.length - 1);
    },
  },
  // Delete, C1 control codes
  {
    start: 0x7f,
    end: 0xa0,
    replace: (character): string => `\\u00${character.charCodeAt(0).toString(16)}`,
  },
]);

export const escapeString = (string: string | undefined): EscapedString =>
  controlCodeReplacer.replaceCharacters(string || '') as EscapedString;
