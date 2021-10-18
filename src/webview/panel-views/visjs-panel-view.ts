import { readFileSync } from 'fs';
import { join } from 'path';
import { Data, Edge, Node, Options } from 'vis-network';
import { ExtensionContext, Uri } from 'vscode';
import { PanelViewProxy, UpdatePanelViewCommand } from './panel-view-proxy';

export class VisjsPanelView implements PanelViewProxy {
  constructor(private readonly context: ExtensionContext) {}

  getHtml(): string {
    const filePath = Uri.file(join(this.context.extensionPath, 'src', 'webview', 'html', 'visjs-debugger-panel.html'));
    return readFileSync(filePath.fsPath, 'utf8');
  }

  updatePanel(): UpdatePanelViewCommand {
    const nodes: Node[] = [
      { id: 'rect1', label: '(Rectangle) rect1:\n(int) borderWidth: 5', borderWidth: 8, borderWidthSelected: 8 },
      { id: 'rect2', label: '(Rectangle) rect2:\n(int) borderWidth: 5' },
      { id: 'point1', label: '(Point)\n(int) x: 21\n(int) y: 12' },
      { id: 'point2', label: '(Point)\n(int) x: 12\n(int) y: 21' },
      {
        id: 'text1',
        label: '(String)\n"This is a..."',
        title:
          "This is a description of the rectangle's purpose. Since the text is quite long, it will be shortened and will have a tooltip.",
      },
      { id: 'color1', label: '(Color)\nBLUE' },
      { id: 'color2', label: '(Color)\nGREEN', borderWidth: 8, borderWidthSelected: 8 },
      { id: 'text2', label: '(String)\n"blue"' },
      { id: 'text3', label: '(String)\n"#0000FF"' },
    ];

    const edges: Edge[] = [
      { id: 'e1', from: 'rect2', to: 'point1', label: 'bottomRight' },
      { id: 'e2', from: 'rect2', to: 'point2', label: 'topLeft' },
      { id: 'e3', from: 'rect2', to: 'text1', label: 'text' },
      { id: 'e4', from: 'rect2', to: 'color1', label: 'backgroudColor' },
      { id: 'e5', from: 'rect2', to: 'color2', label: 'borderColor' },
      { id: 'e6', from: 'color1', to: 'text2', label: 'textValue' },
      { id: 'e7', from: 'color1', to: 'text3', label: 'hexValue' },
    ];

    const data: Data = { edges, nodes };

    const options: Options = {
      edges: {
        arrows: 'to',
      },
      physics: {
        barnesHut: {
          avoidOverlap: 0.2,
        },
      },
    };

    return { command: 'updateVisjs', data, options };
  }
}
