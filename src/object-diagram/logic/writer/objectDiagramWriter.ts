import { Field } from '../../model/field';
import { ObjectDiagram } from '../../model/objectDiagram';
import { Reference } from '../../model/reference';
import { Structure } from '../../model/structure';

export abstract class ObjectDiagramWriter {
  write(objectDiagram: ObjectDiagram): string {
    return `${[...this.generateLines(objectDiagram)].join('\n')}\n`;
  }

  private *generateLines({ structures, fields, references }: ObjectDiagram): Generator<string> {
    yield* this.generateHeaderLines();
    for (const structure of structures) {
      const { id } = structure;
      yield* this.generateStructureDeclarationLines(
        structure,
        fields.filter(({ parentId }) => parentId === id),
        references.filter(({ startId }) => startId === id)
      );
    }
    for (const reference of references) {
      yield* this.generateReferenceDeclarationLines(reference);
    }
    yield* this.generateFooterLines();
  }

  private *generateStructureDeclarationLines(structure: Structure, fields: Field[], references: Reference[]): Generator<string> {
    yield* this.generateStructureHeaderLines(structure);
    const { value } = structure;
    if (value !== undefined) {
      yield* this.generateStructureValueLines(value);
    }
    yield* this.generateFieldLinesFromFields(fields);
    yield* this.generateFieldLinesFromReferences(references);
    yield* this.generateStructureFooterLines();
  }

  private *generateFieldLinesFromFields(fields: Field[]): Generator<string> {
    for (const { name, value, type } of fields) {
      yield* this.generateFieldLines(name, type === undefined ? value : `${value} (${type})`);
    }
  }

  private *generateFieldLinesFromReferences(references: Reference[]): Generator<string> {
    for (const { name } of references) {
      yield* this.generateFieldLines(name, '');
    }
  }

  protected abstract generateHeaderLines(): Generator<string>;
  protected abstract generateStructureHeaderLines(structure: Structure): Generator<string>;
  protected abstract generateStructureValueLines(value: string): Generator<string>;
  protected abstract generateFieldLines(name: string, value: string): Generator<string>;
  protected abstract generateStructureFooterLines(): Generator<string>;
  protected abstract generateReferenceDeclarationLines(reference: Reference): Generator<string>;
  protected abstract generateFooterLines(): Generator<string>;
}
