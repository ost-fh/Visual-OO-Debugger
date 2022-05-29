import { ExtensionContext } from 'vscode';
import { NodeModulesKeys } from '../../node-modules-accessor/nodeModulesKeys';
import { PanelViewColors, PanelViewInputVariableMap, PanelViewVariable } from '../../model/panelViewInput';
import { PanelViewInputObjectDiagramReader } from '../../object-diagram/logic/reader/panelViewInputObjectDiagramReader';
import { AbstractPanelViewProxy } from './abstractPanelViewProxy';
import { JointJsRenderingAreaData } from './joint-js/model/jointJsRenderingAreaData';
import { JointJsRenderingAreaOptions } from './joint-js/model/jointJsRenderingAreaOptions';
import { JointJsRenderingAreaUpdateData } from './joint-js/model/jointJsRenderingAreaUpdateData';
import { getJointJsPanelViewColors, JointJsPanelViewColors } from './joint-js/model/jointJsPanelViewColors';

export class JointJsPanelViewProxy extends AbstractPanelViewProxy<
  JointJsRenderingAreaData,
  JointJsRenderingAreaOptions,
  JointJsRenderingAreaUpdateData
> {
  protected readonly debuggerPanelPrefix = 'jointJs';
  protected readonly extraNodeModuleKeys = [NodeModulesKeys.jointCss];
  private readonly panelViewInputObjectDiagramReader = new PanelViewInputObjectDiagramReader();
  private panelViewColors?: JointJsPanelViewColors;

  constructor(context: ExtensionContext) {
    super(context);
  }

  canRecordGif(): boolean {
    return false;
  }

  canRecordWebm(): boolean {
    return false;
  }

  protected getRenderingAreaData(variables: PanelViewInputVariableMap): JointJsRenderingAreaData {
    return {
      objectDiagram: this.panelViewInputObjectDiagramReader.read(variables),
    };
  }

  protected getRenderingAreaOptions(): JointJsRenderingAreaOptions {
    return {
      panelViewColors: this.panelViewColors,
    };
  }

  protected getRenderingAreaUpdateData(
    newVariables: PanelViewInputVariableMap,
    prevVariables: Map<string, PanelViewVariable>
  ): JointJsRenderingAreaUpdateData {
    const {
      structures: oldStructures,
      fields: oldFields,
      references: oldReferences,
    } = this.panelViewInputObjectDiagramReader.read(prevVariables);
    const {
      structures: newStructures,
      fields: newFields,
      references: newReferences,
    } = this.panelViewInputObjectDiagramReader.read(newVariables);
    return {
      structuresToBeAdded: newStructures.filter(({ id: newId }) => !oldStructures.find(({ id: oldId }) => oldId === newId)),
      structuresToBeUpdated: newStructures.filter(({ id: newId, value: newValue }) =>
        oldStructures.find(({ id: oldId, value: oldValue }) => oldId === newId && oldValue !== newValue)
      ),
      structuresToBeRemoved: oldStructures.filter(({ id: oldId }) => !newStructures.find(({ id: newId }) => newId === oldId)),
      fieldsToBeAdded: newFields.filter(
        ({ parentId: newId, name: newName }) =>
          !oldFields.find(({ parentId: oldId, name: oldName }) => oldId === newId && oldName === newName)
      ),
      fieldsToBeUpdated: newFields.filter(({ parentId: newId, name: newName, value: newValue }) =>
        oldFields.find(
          ({ parentId: oldId, name: oldName, value: oldValue }) => oldId === newId && oldName === newName && oldValue !== newValue
        )
      ),
      fieldsToBeRemoved: oldFields.filter(
        ({ parentId: oldId, name: oldName }) =>
          !newFields.find(({ parentId: newId, name: newName }) => newId === oldId && newName === oldName)
      ),
      referencesToBeAdded: newReferences.filter(
        ({ startId: newStartId, name: newName }) =>
          !oldReferences.find(({ startId: oldStartId, name: oldName }) => oldStartId === newStartId && oldName === newName)
      ),
      referencesToBeUpdated: newReferences.filter(({ startId: newStartId, name: newName, endId: newEndId }) =>
        oldReferences.find(
          ({ startId: oldStartId, name: oldName, endId: oldEndId }) =>
            oldStartId === newStartId && oldName === newName && oldEndId !== newEndId
        )
      ),
      referencesToBeRemoved: oldReferences.filter(
        ({ startId: oldStartId, name: oldName }) =>
          !newReferences.find(({ startId: newStartId, name: newName }) => newStartId === oldStartId && newName === oldName)
      ),
    };
  }

  protected setColors(viewColors: PanelViewColors): void {
    this.panelViewColors = getJointJsPanelViewColors(viewColors);
  }
}
