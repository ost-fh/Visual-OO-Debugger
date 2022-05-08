import { DebugEventManager } from '../../../debug-adapter/debugEventManager';
import { PanelViewInputVariableMap, PanelViewVariable, PrimitiveValue, VariableRelation } from '../../../model/panelViewInput';
import { escapeString } from '../../model/escapedString';
import { Field } from '../../model/field';
import { ObjectDiagram } from '../../model/objectDiagram';
import { Reference } from '../../model/reference';
import { Structure } from '../../model/structure';
import { createStructureId, StructureId } from '../../model/structureId';
import { ObjectDiagramReader } from './objectDiagramReader';

const isObject = (variable: PanelViewVariable): boolean => variable.id.startsWith(DebugEventManager.objectPrefix);

export class PanelViewInputObjectDiagramReader implements ObjectDiagramReader<PanelViewInputVariableMap> {
  read(variables: PanelViewInputVariableMap): ObjectDiagram {
    const stackFrameId = '__stackFrame__';
    const structures: Structure[] = [
      {
        id: createStructureId(stackFrameId),
        type: '[StackFrame]',
      },
    ];
    const fields: Field[] = [];
    const references: Reference[] = [];
    for (const variable of variables.values()) {
      const structureId = createStructureId(variable.id);
      if (isObject(variable)) {
        structures.push(this.createStructure(variable, structureId));
        fields.push(...this.createFieldsFromPrimitiveValues(variable.primitiveValues, structureId));
      }

      const relations = this.getRelationsOfVariable(variable, stackFrameId);
      if (!isObject(variable)) {
        if (this.validateVariable(variable)) {
          fields.push(...this.createFieldsFromRelations(relations, variable));
        }
      } else {
        references.push(...this.createReferencesFromRelations(relations, stackFrameId, structureId, variables));
      }
    }
    return {
      structures,
      fields,
      references,
    };
  }

  private createStructure(variable: PanelViewVariable, structureId: StructureId): Structure {
    const structure: Structure = {
      id: structureId,
      type: variable.type as string,
    };
    switch (variable.value) {
      case undefined:
        break;
      case 'null':
        throw new Error('Unexpected null value for object');
      default:
        structure.value = escapeString(variable.value);
    }

    return structure;
  }

  private getRelationsOfVariable(variable: PanelViewVariable, stackFrameId: string): VariableRelation[] {
    // We can safely ignore the references here as we already process the incoming relations
    if (variable.incomingRelations) {
      return variable.incomingRelations;
    } else {
      if (!variable.name) {
        throw new Error('Anonymous object references not supported');
      }
      return [
        {
          relationName: variable.name,
          parentId: stackFrameId,
        },
      ];
    }
  }

  private createFieldsFromRelations(relations: VariableRelation[], variable: PanelViewVariable): Field[] {
    return relations.map(
      ({ relationName, parentId }): Field => ({
        parentId: createStructureId(parentId),
        name: relationName,
        value: escapeString(variable.value),
        type: variable.type,
      })
    );
  }

  private createFieldsFromPrimitiveValues(primitiveValues: PrimitiveValue[] | undefined, structureId: StructureId): Field[] {
    return (primitiveValues || []).map(
      (primitiveValue): Field => ({
        parentId: structureId,
        ...primitiveValue,
        value: escapeString(primitiveValue.value),
      })
    );
  }

  private createReferencesFromRelations(
    relations: VariableRelation[],
    stackFrameId: string,
    structureId: StructureId,
    variables: PanelViewInputVariableMap
  ): Reference[] {
    return relations.map(
      ({ relationName, parentId }): Reference => ({
        startId: createStructureId(relationName ? parentId : stackFrameId),
        endId: structureId,
        name: relationName || (variables.get(parentId)?.name as string),
      })
    );
  }

  private validateVariable(variable: PanelViewVariable): boolean {
    switch (variable.value) {
      case undefined:
        if (variable.type === undefined) {
          return false;
        }
        throw new Error('Cannot register attributes without values');
      case 'null':
        if (variable.type !== undefined) {
          throw new Error('Unexpected type for null value');
        }
        break;
      default:
        if (variable.type === undefined) {
          throw new Error('Type missing for primitive value');
        }
        break;
    }
    return true;
  }
}
