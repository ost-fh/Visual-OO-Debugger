import { EscapedString } from './escapedString';
import { StructureId } from './structureId';

/**
 *  Structures are containers of fields.
 *  Examples are Java objects and stack frames.
 *  Some Java objects, such as strings, use a value instead of a
 *  Currently, no distinction is made between parameters and local variables in
 *  stack frames.
 */
export interface Structure {
  id: StructureId;
  type: string;
  name: EscapedString;
  value?: EscapedString;
}
