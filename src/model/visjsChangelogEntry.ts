import { Edge, Node } from 'vis-network';

export interface VisjsChangelogEntry {
  nodeChanges: ChangedNode[];
  edgeChanges: ChangedEdge[];
}

export type ChangedNode =
  | { action: ChangeAction.create | ChangeAction.delete; node: Node }
  | { action: ChangeAction.update; oldNode: Node; newNode: Node };

export type ChangedEdge = { action: ChangeAction.create | ChangeAction.delete; edge: Edge };

export enum ChangeAction {
  create,
  update,
  delete,
}
