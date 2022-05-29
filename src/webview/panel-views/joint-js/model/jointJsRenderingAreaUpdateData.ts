import { Field } from '../../../../object-diagram/model/field';
import { Reference } from '../../../../object-diagram/model/reference';
import { Structure } from '../../../../object-diagram/model/structure';

export type StructureToBeAdded = Structure;
export type StructureToBeUpdated = Pick<Structure, 'id' | 'value'>;
export type StructureToBeRemoved = Pick<Structure, 'id'>;

export type FieldToBeAdded = Field;
export type FieldToBeUpdated = Pick<Field, 'parentId' | 'name' | 'value'>;
export type FieldToBeRemoved = Pick<Field, 'parentId' | 'name'>;

export type ReferenceToBeAdded = Reference;
export type ReferenceToBeUpdated = Reference;
export type ReferenceToBeRemoved = Reference;

export interface JointJsRenderingAreaUpdateData {
  structuresToBeAdded: StructureToBeAdded[];
  structuresToBeUpdated: StructureToBeUpdated[];
  structuresToBeRemoved: StructureToBeRemoved[];
  fieldsToBeAdded: FieldToBeAdded[];
  fieldsToBeUpdated: FieldToBeUpdated[];
  fieldsToBeRemoved: FieldToBeRemoved[];
  referencesToBeAdded: ReferenceToBeAdded[];
  referencesToBeUpdated: ReferenceToBeUpdated[];
  referencesToBeRemoved: ReferenceToBeRemoved[];
}
