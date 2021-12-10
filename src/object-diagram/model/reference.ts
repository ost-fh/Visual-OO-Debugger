import { StructureId } from './structureId';

export interface Reference {
  startId: StructureId;
  endId: StructureId;
  name: string;
}
