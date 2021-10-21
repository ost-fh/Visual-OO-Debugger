export interface VisjsPanelViewInput {
  variables: Map<number | string, VisjsPanelViewVariable>; // The key is the value of an object or a random uuid for primitives
}

export interface VisjsPanelViewVariable {
  id: string;
  type?: string;
  value?: string;
  tooltip?: string;
  name?: string;
  primitiveValues?: PrimitiveValue[];
  incomingRelations?: VariableRelation[];
}

export interface VariableRelation {
  relationName: string;
  parentId: string;
}

export interface PrimitiveValue {
  type: string;
  name: string;
  value: string;
}
