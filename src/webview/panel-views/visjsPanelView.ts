import { readFileSync } from 'fs';
import { join } from 'path';
import { Data, Edge, Node, Options } from 'vis-network';
import { ExtensionContext, Uri } from 'vscode';
import { PanelViewInput, PanelViewVariable } from '../../model/panelViewInput';
import { PanelViewProxy, PanelViewCommand } from './panelViewProxy';

export class VisjsPanelView implements PanelViewProxy {
  constructor(private readonly context: ExtensionContext) {}

  getHtml(): string {
    const filePath = Uri.file(join(this.context.extensionPath, 'src', 'webview', 'html', 'visjsDebuggerPanel.html'));
    return readFileSync(filePath.fsPath, 'utf8');
  }

  updatePanel(panelViewInput: PanelViewInput): PanelViewCommand {
    const options: Options = {
      edges: {
        arrows: 'to',
      },
      physics: {
        barnesHut: {
          avoidOverlap: 0.1,
        },
      },
    };

    return { command: 'updateVisjs', data: this.parseInputToData(panelViewInput), options };
  }

  exportPanel(): PanelViewCommand {
    return { command: 'exportVisjs' };
  }

  private parseInputToData(panelViewInput: PanelViewInput): Data {
    const nodes: Node[] = [];
    let edges: Edge[] = [];

    if (panelViewInput?.variables) {
      for (const variable of panelViewInput.variables.values()) {
        nodes.push(this.createNode(variable));
        edges = [...edges, ...this.createEdges(variable)];
      }
    }

    return { nodes, edges };
  }

  private createNode(variable: PanelViewVariable): Node {
    const hasValueAndType = variable.type && variable.name;
    const topLine = `${variable.type ? `(${variable.type})` : ''}${hasValueAndType ? ' ' : ''}${variable.name ? `${variable.name}` : ''}`;
    let bottomSection: string | undefined;
    if (variable.value) {
      bottomSection = variable.value;
    } else if (variable.primitiveValues && variable.primitiveValues.length > 0) {
      bottomSection = variable.primitiveValues.map((value) => `(${value.type}) ${value.name}: ${value.value}`).join('\n');
    }

    let label = '';
    if (topLine.length > 0) {
      label = topLine;
      if (bottomSection && bottomSection.length > 0) {
        label += `:\n${bottomSection}`;
      }
    } else if (bottomSection) {
      label = bottomSection;
    }

    return { id: variable.id, label, title: variable.tooltip };
  }

  private createEdges(variable: PanelViewVariable): Edge[] {
    const edges: Edge[] = [];

    for (const relation of variable.incomingRelations || []) {
      edges.push({
        id: `${relation.parentId}to${variable.id}`,
        from: relation.parentId,
        to: variable.id,
        label: relation.relationName,
      });
    }

    return edges;
  }
}
