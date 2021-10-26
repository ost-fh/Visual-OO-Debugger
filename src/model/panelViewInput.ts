export interface PanelViewInput {
  variables: Map<string, PanelViewVariable>; // The key is the value of an object or a random uuid for primitives
}

export interface PanelViewVariable {
  id: string;
  type?: string;
  value?: string;
  tooltip?: string;
  name?: string;
  primitiveValues?: PrimitiveValue[];
  incomingRelations?: VariableRelation[];
  references?: VariableReference[];
}

export interface VariableRelation {
  relationName: string;
  parentId: string;
}

export interface VariableReference {
  relationName: string;
  childId: string;
}

export interface PrimitiveValue {
  type: string;
  name: string;
  value: string;
}
