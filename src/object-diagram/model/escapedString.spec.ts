import { expect } from 'chai';
import { escapeString } from './escapedString';

const to16BitHex = (number: number): string => number.toString(16).padStart(4, '0');

const itShouldEscapeCharacter = (charCode: number, escapeSequenceLetter?: string): void => {
  const hex = to16BitHex(charCode);
  const expected = escapeSequenceLetter === undefined ? `\\u${hex}` : `\\${escapeSequenceLetter}`;
  it(`should escape the character of char code 0x${hex} as '${expected}'`, () =>
    void expect(escapeString(String.fromCharCode(charCode))).to.equal(expected));
};

const itShouldNotEscapeCharacter = (charCode: number): void => {
  const char = String.fromCharCode(charCode);
  it(`should NOT escape the character '${char}' (char code: 0x${to16BitHex(charCode)})'`, () =>
    void expect(escapeString(char)).to.equal(char));
};

describe('EscapedString', () =>
  describe('escapeString', () => {
    describe('C0 control characters', () => {
      for (let charCode = 0x00; charCode < 0x08; charCode++) {
        itShouldEscapeCharacter(charCode);
      }
      itShouldEscapeCharacter(0x08, 'b');
      itShouldEscapeCharacter(0x09, 't');
      itShouldEscapeCharacter(0x0a, 'n');
      itShouldEscapeCharacter(0x0b);
      itShouldEscapeCharacter(0x0c, 'f');
      itShouldEscapeCharacter(0x0d, 'r');
      for (let charCode = 0x0e; charCode < 0x20; charCode++) {
        itShouldEscapeCharacter(charCode);
      }
    });
    describe('printable ASCII characters', () => {
      for (let charCode = 0x20; charCode < 0x7f; charCode++) {
        itShouldNotEscapeCharacter(charCode);
      }
    });
    describe('delete character', () => {
      itShouldEscapeCharacter(0x7f);
    });
    describe('C1 control characters', () => {
      for (let charCode = 0x80; charCode < 0xa0; charCode++) {
        itShouldEscapeCharacter(charCode);
      }
    });
  }));
