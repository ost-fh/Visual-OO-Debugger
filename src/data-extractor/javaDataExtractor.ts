import { DebugProtocol } from '@vscode/debugprotocol';
import * as hash from 'object-hash';
import { PanelViewVariable, PrimitiveValue, VariableReference, VariableRelation } from '../model/panelViewInput';
import { addNullPrefix, addObjectPrefix, addVariablePrefix } from '../util/nodePrefixHandler';
import { AbstractDataExtractor } from './abstractDataExtractor';

export class JavaDataExtractor extends AbstractDataExtractor {
  private readonly primitiveArrayDataTypes = ['boolean[]', 'char[]', 'byte[]', 'short[]', 'int[]', 'long[]', 'float[]', 'double[]'];
  private readonly primitiveDataTypes = ['boolean', 'char', 'byte', 'short', 'int', 'long', 'float', 'double'];
  private readonly sizeSuffix = 'size=';

  nullText = 'null';

  isPrimitiveVariable(variable: DebugProtocol.Variable): boolean {
    return variable.type !== undefined && this.primitiveDataTypes.includes(variable.type);
  }

  isPrimitiveArrayVariable(variable: DebugProtocol.Variable): boolean {
    return variable.type !== undefined && this.primitiveArrayDataTypes.includes(variable.type);
  }

  isNullVariable(variable: DebugProtocol.Variable): boolean {
    return variable.type === 'null';
  }

  isStringVariable(variable: DebugProtocol.Variable): boolean {
    return variable.type === 'String';
  }

  isStringArrayVariable(variable: DebugProtocol.Variable): boolean {
    return variable.type === 'String[]';
  }

  createPrimitiveVariable(variable: DebugProtocol.Variable): PanelViewVariable {
    return {
      id: addVariablePrefix(hash(variable)),
      name: variable.name,
      type: variable.type,
      value: variable.value,
    };
  }

  createPrimitiveValue(variable: DebugProtocol.Variable): PrimitiveValue {
    if (variable.type === undefined) {
      throw new Error(`Primitive value "${variable.name}" is missing a type`);
    }
    return { type: variable.type, name: variable.name, value: variable.value };
  }

  createVariableId(variable: DebugProtocol.Variable): string {
    return this.isNullVariable(variable) ? addNullPrefix(hash(variable)) : addObjectPrefix(variable.value.split(this.sizeSuffix)[0]);
  }

  createVariableRelation(parentId: string, variable: DebugProtocol.Variable | undefined): VariableRelation {
    return { parentId, relationName: variable?.name ?? '' };
  }

  createVariableReference(childId: string, variable: DebugProtocol.Variable | undefined): VariableReference {
    return { childId, relationName: variable?.name ?? '' };
  }

  createVariableEntryForNamedVariable(referencedObjectId: string, variable: DebugProtocol.Variable): PanelViewVariable {
    return {
      id: addVariablePrefix(variable.name),
      name: variable.name,
      references: [this.createVariableReference(referencedObjectId, undefined)],
    };
  }

  createArrayString(variables: DebugProtocol.Variable[]): string {
    return `[${variables.map((v) => v.value).join(',')}]`;
  }
}
