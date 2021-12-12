import { Reference } from '../../model/reference';
import { Structure } from '../../model/structure';
import { ObjectDiagramWriter } from './objectDiagramWriter';

const escapeDoubleQuotes = (name: string): string => name.replace(/"/g, '<U+0022>');

export class PlantUmlObjectDiagramWriter extends ObjectDiagramWriter {
  protected *generateHeaderLines(): Generator<string> {
    yield '@startuml';
  }
  protected *generateStructureHeaderLines({ id, type, name, value }: Structure): Generator<string> {
    yield `${value ? 'object' : 'map'} "${escapeDoubleQuotes(name)}" as ${id} <<${type}>> {`;
  }
  protected *generateStructureValueLines(value: string): Generator<string> {
    yield `  ${value}`;
  }
  protected *generateFieldLines(name: string, value: string): Generator<string> {
    const formattedValue = value && ` ${value}`;
    yield `  ${name} =>${formattedValue}`;
  }
  protected *generateStructureFooterLines(): Generator<string> {
    yield '}';
  }
  protected *generateReferenceDeclarationLines({ startId, endId, name }: Reference): Generator<string> {
    yield `${startId}::${name} => ${endId} : ${name}`;
  }
  protected *generateFooterLines(): Generator<string> {
    yield '@enduml';
  }
}
