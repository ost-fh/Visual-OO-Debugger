import { Field } from './field';
import { Reference } from './reference';
import { Structure } from './structure';

export interface ObjectDiagram {
  structures: Structure[];
  fields: Field[];
  references: Reference[];
}
