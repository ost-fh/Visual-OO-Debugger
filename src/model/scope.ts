export interface Scope {
  name: string;
  presentationHint?: 'arguments' | 'locals' | 'registers' | string;
  variablesReference: number;
  namedVariables?: number;
  indexedVariables?: number;
  expensive: boolean;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
}
