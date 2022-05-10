export interface PanelViewInput {
  callstack: PanelViewStackFrame[];
}

// The key is the value of an object or the hash of the variable for primitives
export type PanelViewInputVariableMap = Map<string, PanelViewVariable>;

export interface PanelViewStackFrame {
  name: string;
  variables: PanelViewInputVariableMap;
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

export interface PanelViewColors {
  defaultColor: NodeColor;
  variableColor: NodeColor;
  changedColor: NodeColor;
  changedVariableColor: NodeColor;
}

export interface NodeColor {
  background: string;
  fallback: string;
  border?: string;
  font?: string;
}
