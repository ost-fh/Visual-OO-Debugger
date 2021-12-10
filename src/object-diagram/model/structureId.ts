import * as objectHash from 'object-hash';
import { Phantom } from '../utilities/typing/phantom';

export type StructureId = Phantom<
  string,
  {
    readonly _: unique symbol;
  }
>;

export const createStructureId = (id: string): StructureId => `_${objectHash(id)}` as StructureId;
