import { Reference } from '../../model/reference';
import { Structure } from '../../model/structure';
import { ObjectDiagramWriter } from './objectDiagramWriter';

export class GraphVizObjectDiagramWriter extends ObjectDiagramWriter {
  protected *generateHeaderLines(): Generator<string> {
    yield 'digraph ObjectDiagram {';
    yield '  node [shape=plaintext]';
  }
  protected *generateStructureHeaderLines({ id, type, name }: Structure): Generator<string> {
    yield `  ${id} [label=<<table border="0" cellborder="1" cellspacing="0">`;
    yield `    <th><td colspan="2"><b>${name}</b><br/><i>&lt;&lt;${type}&gt;&gt;</i></td></th>`;
  }
  protected *generateStructureValueLines(value: string): Generator<string> {
    yield `    <tr><td colspan="2">${value}</td></tr>`;
  }
  protected *generateFieldLines(name: string, value: string): Generator<string> {
    yield `    <tr><td align="left">${name}</td><td align="left" port="${name}">${value}</td></tr>`;
  }
  protected *generateStructureFooterLines(): Generator<string> {
    yield '  </table>>]';
  }
  protected *generateReferenceDeclarationLines({ startId, endId, name }: Reference): Generator<string> {
    yield `  ${startId}:${name} -> ${endId} [label="${name}"]`;
  }
  protected *generateFooterLines(): Generator<string> {
    yield '}';
  }
}
