import { EscapedString } from './escapedString';
import { StructureId } from './structureId';

/**
 *  Fields represent either parameters and local variables (both on stack
 *  frames) or attributes on a Java object.
 */
export interface Field {
  parentId: StructureId;
  type?: string;
  name: string;
  value: EscapedString;
}
