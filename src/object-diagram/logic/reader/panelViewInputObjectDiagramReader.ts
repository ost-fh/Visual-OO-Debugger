import { PanelViewInputVariableMap, VariableRelation } from '../../../model/panelViewInput';
import { escapeString } from '../../model/escapedString';
import { Field } from '../../model/field';
import { ObjectDiagram } from '../../model/objectDiagram';
import { isPrimitiveJavaType, PrimitiveJavaType } from '../../model/primitiveJavaType';
import { Reference } from '../../model/reference';
import { Structure } from '../../model/structure';
import { createStructureId } from '../../model/structureId';
import { ObjectDiagramReader } from './objectDiagramReader';

const isUndefinedOrPrimitiveJavaType = (type: string | undefined): type is undefined | PrimitiveJavaType =>
  type === undefined || isPrimitiveJavaType(type);

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
    for (const { id, type, value, name, primitiveValues, incomingRelations } of variables.values()) {
      const structureId = createStructureId(id);
      if (!isUndefinedOrPrimitiveJavaType(type)) {
        const structure: Structure = {
          id: structureId,
          type,
        };
        switch (value) {
          case undefined:
            break;
          case 'null':
            throw new Error('Unexpected null value for object');
          default:
            structure.value = escapeString(value);
        }
        structures.push(structure);
      }
      primitiveValues?.forEach((primitiveValue) => {
        fields.push({
          parentId: structureId,
          ...primitiveValue,
          value: escapeString(primitiveValue.value),
        });
      });
      let relations: VariableRelation[];
      if (incomingRelations) {
        relations = incomingRelations;
      } else {
        if (!name) {
          throw new Error('Anonymous object references not supported');
        }
        relations = [
          {
            relationName: name,
            parentId: stackFrameId,
          },
        ];
      }
      if (isUndefinedOrPrimitiveJavaType(type)) {
        switch (value) {
          case undefined:
            if (type === undefined) {
              continue;
            }
            throw new Error('Cannot register attributes without values');
          case 'null':
            if (type !== undefined) {
              throw new Error('Unexpected type for null value');
            }
            break;
          default:
            if (type === undefined) {
              throw new Error('Type missing for primitive value');
            }
            break;
        }
        relations.forEach(({ relationName, parentId }) => {
          const field: Field = {
            parentId: createStructureId(parentId),
            name: relationName,
            value: escapeString(value),
          };
          if (type !== undefined) {
            field.type = type;
          }
          fields.push(field);
        });
      } else {
        relations.forEach(({ relationName, parentId }) => {
          references.push({
            startId: createStructureId(relationName ? parentId : stackFrameId),
            endId: structureId,
            name: relationName || (variables.get(parentId)?.name as string),
          });
        });
      }
      // We can safely ignore the references here as we have already processed the incoming relations
    }
    return {
      structures,
      fields,
      references,
    };
  }
}
