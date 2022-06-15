import { DebugProtocol } from '@vscode/debugprotocol';
import { PanelViewVariable, PrimitiveValue, VariableReference, VariableRelation } from '../model/panelViewInput';

export abstract class AbstractDataExtractor {
  abstract nullText: string;

  abstract isPrimitiveVariable(variable: DebugProtocol.Variable): boolean;
  abstract isPrimitiveArrayVariable(variable: DebugProtocol.Variable): boolean;
  abstract isNullVariable(variable: DebugProtocol.Variable): boolean;
  abstract isStringVariable(variable: DebugProtocol.Variable): boolean;
  abstract isStringArrayVariable(variable: DebugProtocol.Variable): boolean;

  abstract createPrimitiveVariable(variable: DebugProtocol.Variable): PanelViewVariable;
  abstract createPrimitiveValue(variable: DebugProtocol.Variable): PrimitiveValue;
  abstract createVariableId(variable: DebugProtocol.Variable, parentId?: string): string;
  abstract createVariableRelation(parentId: string, variable: DebugProtocol.Variable | undefined): VariableRelation;
  abstract createVariableReference(childId: string, variable: DebugProtocol.Variable | undefined): VariableReference;
  abstract createVariableEntryForNamedVariable(referencedObjectId: string, variable: DebugProtocol.Variable): PanelViewVariable;
  abstract createArrayString(variables: DebugProtocol.Variable[]): string;
}
