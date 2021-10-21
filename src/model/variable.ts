export interface Variable {
  name: string;
  value: string;
  type: string;
  presentationHint?: VariablePresentationHint;
  evaluateName?: string;
  variablesReference: number;
  namedVariables?: number;
  indexedVariables?: number;
  memoryReference?: string;
}

export interface VariablePresentationHint {
  kind?:
    | 'property'
    | 'method'
    | 'class'
    | 'data'
    | 'event'
    | 'baseClass'
    | 'innerClass'
    | 'interface'
    | 'mostDerivedClass'
    | 'virtual'
    | 'dataBreakpoint'
    | string;

  attributes?: (
    | 'static'
    | 'constant'
    | 'readOnly'
    | 'rawString'
    | 'hasObjectId'
    | 'canHaveObjectId'
    | 'hasSideEffects'
    | 'hasDataBreakpoint'
    | string
  )[];

  visibility?: 'public' | 'private' | 'protected' | 'internal' | 'final' | string;
}
