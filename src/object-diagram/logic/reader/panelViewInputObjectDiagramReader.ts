import { hasNullPrefix, hasObjectPrefix, hasVariablePrefix } from '../../../util/nodePrefixHandler';
import { PanelViewInputVariableMap, PanelViewVariable, PrimitiveValue, VariableRelation } from '../../../model/panelViewInput';
import { escapeString } from '../../model/escapedString';
import { Field } from '../../model/field';
import { ObjectDiagram } from '../../model/objectDiagram';
import { Reference } from '../../model/reference';
import { Structure } from '../../model/structure';
import { createStructureId, StructureId } from '../../model/structureId';
import { ObjectDiagramReader } from './objectDiagramReader';

const isObject = (variable: PanelViewVariable): boolean => hasObjectPrefix(variable.id);

const isNullOfObject = (variable: PanelViewVariable): boolean =>
  hasNullPrefix(variable.id) && variable.incomingRelations !== undefined && Boolean(variable.incomingRelations[0].relationName);

const isNullOfVariable = (variable: PanelViewVariable): boolean =>
  hasNullPrefix(variable.id) && variable.incomingRelations !== undefined && !variable.incomingRelations[0].relationName;

const isPrimitiveVariable = (variable: PanelViewVariable): boolean =>
  hasVariablePrefix(variable.id) && Boolean(variable.value) && Boolean(variable.type);

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
      const relations = this.getRelationsOfVariable(variable, stackFrameId);
      if (isObject(variable)) {
        const structureId = createStructureId(variable.id);
        structures.push(this.createStructure(variable, structureId));
        fields.push(...this.createFieldsFromPrimitiveValues(variable.primitiveValues, structureId));
        references.push(...this.createReferencesFromRelations(relations, stackFrameId, structureId, variables));
      } else if (isPrimitiveVariable(variable) || isNullOfObject(variable)) {
        fields.push(...this.createFieldsFromRelations(relations, variable));
      } else if (isNullOfVariable(variable)) {
        const parentVariable = variables.get(relations[0].parentId) as PanelViewVariable;
        const variableName = parentVariable.name as string;
        fields.push({
          name: variableName,
          parentId: createStructureId(stackFrameId),
          value: escapeString('null'),
        });
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
    } else if (!variable.name) {
      throw new Error('Anonymous object references not supported');
    }
    return [
      {
        relationName: variable.name,
        parentId: stackFrameId,
      },
    ];
  }

  private createFieldsFromRelations(relations: VariableRelation[], variable: PanelViewVariable): Field[] {
    return relations.map(({ relationName, parentId }): Field => {
      const field: Field = {
        parentId: createStructureId(parentId),
        name: relationName,
        value: escapeString(variable.value),
      };
      if (variable.type) {
        field.type = variable.type;
      }
      return field;
    });
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
}
