import { dia, shapes } from 'jointjs';
import { Structure } from '../../../../object-diagram/model/structure';
import { JointJsColors } from '../model/jointJsColors';
import {
  FieldToBeAdded,
  FieldToBeRemoved,
  FieldToBeUpdated,
  ReferenceToBeAdded,
  ReferenceToBeRemoved,
  ReferenceToBeUpdated,
  StructureToBeUpdated,
} from '../model/jointJsRenderingAreaUpdateData';
import { computeMaximalTextWidth } from '../utilities/textWidth';
import { Reference } from '../../../../object-diagram/model/reference';
import { Field } from '../../../../object-diagram/model/field';

type UmlClassSectionName = 'name' | 'attributes' | 'methods';

class UmlClassSectionDescriptor {
  constructor(private readonly topOffset: number, private readonly rowHeight: number, private readonly bottomOffset: number) {}

  calculateHeight(rowCount: number): number {
    return this.topOffset + rowCount * this.rowHeight + this.bottomOffset;
  }

  calculateRowMiddleY(index: number): number {
    return this.topOffset + (index + 0.5) * this.rowHeight;
  }
}

// const getUmlClassSectionHeight = (descriptor: UmlClassSectionDescriptor, rowCount: number): number =>
//   umlClassSectionStrokeWidth + descriptor.topOffset + descriptor.bottomOffset + rowCount * descriptor.lineHeight;

// const getUmlClassSectionRowY = (descriptor: UmlClassSectionDescriptor, index: number): number =>
//   (umlClassSectionStrokeWidth - portCircleRadius) / 2 + descriptor.topOffset + (index + 0.5) * descriptor.lineHeight;

type UmlClassAttributesAttrs = shapes.uml.ClassAttributes['attrs'];

type SectionName = 'name' | 'attributes' | 'methods';

type SectionRowsPatcher = (rows: string[]) => string[];

export class StructureShape extends shapes.uml.Class {
  //  Initialization

  static create(
    { id, type, value }: Structure,
    nodeColors: JointJsColors | undefined,
    variableColors: JointJsColors | undefined
  ): StructureShape {
    const name = [`<<${type}>>`];
    if (value) {
      name.push(value);
    }
    return new StructureShape(id, this.createUmlClassAttributes(id, name, nodeColors, variableColors));
  }

  private static createUmlClassAttributes(
    id: string,
    name: string[],
    nodeColors: JointJsColors | undefined,
    variableColors: JointJsColors | undefined
  ): shapes.uml.ClassAttributes {
    return {
      name,
      attributes: [],
      methods: [],
      attrs: {
        ...this.createGlobalColorUmlClassAttributesAttrs(nodeColors, variableColors),
      },
      ports: {
        groups: this.createPortGroupsByName(variableColors),
        items: [this.createPort(this.ingressPortGroupName, id)],
      },
    };
  }

  private static createGlobalColorUmlClassAttributesAttrs(
    nodeColors: JointJsColors | undefined,
    variableColors: JointJsColors | undefined
  ): UmlClassAttributesAttrs {
    return {
      ['.uml-class-name-rect']: nodeColors,
      ['.uml-class-attrs-rect']: variableColors,
      ['.uml-class-name-text']: {
        fill: nodeColors?.color,
        ref: '.uml-class-name-rect',
      },
      ['.uml-class-attrs-text']: {
        fill: variableColors?.color,
        ref: '.uml-class-attrs-rect',
      },
    };
  }

  private static createNameSectionColorUmlClassAttributesAttrs(nodeColors: JointJsColors | undefined): UmlClassAttributesAttrs {
    return {
      ['.uml-class-name-rect/1']: nodeColors,
      ['.uml-class-name-text/1']: {
        fill: nodeColors?.color,
        ref: '.uml-class-name-rect',
      },
    };
  }

  private static createPortGroupsByName(colors: JointJsColors | undefined): Record<string, dia.Element.PortGroup> {
    return {
      [this.ingressPortGroupName]: this.createPortGroup(colors, 'top'),
      [this.egressPortGroupName]: this.createPortGroup(colors, 'right'),
    };
  }

  private static createPortGroup(colors: JointJsColors | undefined, position: string): dia.Element.PortGroup {
    return {
      position: position,
      attrs: {
        circle: {
          ...colors,
          pointerEvents: 'none',
          r: this.portCircleRadius,
        },
      },
    };
  }

  private static createPort(group: typeof this.ingressPortGroupName | typeof this.egressPortGroupName, id: string): dia.Element.Port {
    return {
      group,
      id,
      z: -1,
    };
  }

  private constructor(private readonly structureId: string, attributes?: shapes.uml.ClassAttributes, opt?: { [key: string]: unknown }) {
    super(attributes, opt);
  }

  //  Geometry :: Size

  optimizeSize(document: Document): void {
    const { height, width } = this.calculateOptimalSize(document);
    this.size(width, height);
  }

  private calculateOptimalSize(document: Document): dia.Size {
    let height = 0;
    const rows: string[] = [];
    (
      [
        'name',
        'attributes',
        //  The methods section is hidden (see jointJsDebuggerPanel.css)
        // 'methods',
      ] as SectionName[]
    ).forEach((name) => {
      const sectionRows = this.getSectionRows(name);
      height += StructureShape.sectionDescriptorsByName[name].calculateHeight(sectionRows.length);
      rows.push(...sectionRows);
    });
    return {
      width: computeMaximalTextWidth(document, ...rows),
      height,
    };
  }

  private static readonly sectionDescriptorsByName = Object.freeze<Record<UmlClassSectionName, UmlClassSectionDescriptor>>({
    name: new UmlClassSectionDescriptor(5, 12, 5),
    attributes: new UmlClassSectionDescriptor(8, 12, 6),
    methods: new UmlClassSectionDescriptor(8, 12, 6),
  });

  //  Geometry :: Egress ports

  setEgressPortYs(): void {
    this.attributesSectionRows.forEach((attribute, index) => {
      const [attributeName] = StructureShape.parseAttributesSectionRow(attribute);
      const { args } = this.getPort(attributeName);
      if (!args) {
        throw new Error(`Cannot set structure UML class egress port ys: Port '${attributeName}' not found`);
      }
      args.y = this.getEgressPortY(index);
    });
  }

  private getEgressPortY(index: number): number {
    return (
      StructureShape.sectionDescriptorsByName.name.calculateHeight(this.nameSectionRows.length) +
      StructureShape.sectionDescriptorsByName.attributes.calculateRowMiddleY(index) -
      StructureShape.portCircleRadius
    );
  }

  private static readonly portCircleRadius = 3.5;

  //  Sections :: Name

  private get nameSectionRows(): string[] {
    return this.getSectionRows('name');
  }

  private set nameSectionRows(rows: string[]) {
    this.setSectionRows('name', rows);
  }

  //  Sections :: Attributes

  private patchAttributesSectionRows(patcher: SectionRowsPatcher): void {
    this.checkAttributesSectionRowsAndEgressPortsConsistency();
    this.patchSectionRows('attributes', patcher);
    this.checkAttributesSectionRowsAndEgressPortsConsistency();
  }

  private get attributesSectionRows(): string[] {
    return this.getSectionRows('attributes');
  }

  private static parseAttributesSectionRow(row: string): string[] {
    return row.split(this.fieldNameAndValueSeparator);
  }

  private static createAttributesSectionRow(name: string, value?: string): string {
    return value === undefined ? name : `${name}${this.fieldNameAndValueSeparator}${value}`;
  }

  private static readonly fieldNameAndValueSeparator = ': ';

  //  Sections :: Methods (unused)

  //  Sections :: Common

  private patchSectionRows(name: SectionName, patcher: SectionRowsPatcher): void {
    this.setSectionRows(name, patcher([...this.getSectionRows(name)]));
  }

  private getSectionRows(name: SectionName): string[] {
    return this.get(name) as string[];
  }

  private setSectionRows(name: SectionName, rows: string[]): void {
    this.set(name, rows);
  }

  //  Ports :: Ingress

  get ingressPort(): dia.Element.Port {
    const [port] = this.getGroupPorts(StructureShape.ingressPortGroupName);
    if (!port) {
      throw new Error('Ingress port not found');
    }
    return port;
  }

  private static readonly ingressPortGroupName = 'ingress' as const;

  //  Ports :: Ingress

  get egressPorts(): dia.Element.Port[] {
    return this.getGroupPorts(StructureShape.egressPortGroupName);
  }

  private static readonly egressPortGroupName = 'egress' as const;

  //  Operations :: Structures

  updateStructure({ value }: StructureToBeUpdated, colors: JointJsColors | undefined): void {
    this.value = value;
    this.valueColors = colors;
  }

  private set value(value: string | undefined) {
    const rows = this.nameSectionRows.slice(0, 1);
    if (value) {
      rows.push(value);
    }
    this.nameSectionRows = rows;
  }

  private set valueColors(colors: JointJsColors | undefined) {
    this.attr('.', StructureShape.createNameSectionColorUmlClassAttributesAttrs(colors));
  }

  //  Operations :: Fields

  addField(field: FieldToBeAdded, colors: JointJsColors | undefined): void {
    this.checkStructureIdForField(field);
    this.addFieldOrEgressReference(colors, field.name, field.value);
  }

  updateField(field: FieldToBeUpdated, colors: JointJsColors | undefined): void {
    this.checkStructureIdForField(field);
    this.updateAttributesSectionRow(colors, field.name, field.value);
  }

  removeField(field: FieldToBeRemoved): void {
    this.checkStructureIdForField(field);
    this.removeAttributesSectionRowAndEgressPort(field.name);
  }

  //  Operations :: References

  addEgressReference(reference: ReferenceToBeAdded, colors: JointJsColors | undefined): void {
    this.checkStructureIdForEgressReference(reference);
    this.addFieldOrEgressReference(colors, reference.name);
  }

  updateEgressReference(reference: ReferenceToBeUpdated, colors: JointJsColors | undefined): void {
    this.checkStructureIdForEgressReference(reference);
    this.updateAttributesSectionRow(colors, reference.name);
  }

  removeEgressReference(reference: ReferenceToBeRemoved): void {
    this.checkStructureIdForEgressReference(reference);
  }

  //  Operations :: Shared

  private addFieldOrEgressReference(colors: JointJsColors | undefined, name: string, value?: string): void {
    this.checkAttributesSectionRowsAndEgressPortsConsistency();
    if (this.hasPort(name)) {
      const [, attributeValue] = this.getAttributesSectionRowParts(name);
      if (value === undefined) {
        if (attributeValue !== undefined) {
          throw new Error(
            'Cannot add field (attribute value collision): This should be either a field update or a reference nullification'
          );
        }
      } else {
        //  FIXME: This is always ok in combination with reference removal?
        // if (attributeValue === undefined) {
        //   throw new Error('Cannot add reference: This is not a transition from or to a null reference');
        // }
      }
      this.updateAttributesSectionRow(colors, name, value);
    } else {
      this.addAttributesSectionRowAndEgressPort(colors, name, value);
    }
    this.checkAttributesSectionRowsAndEgressPortsConsistency();
  }

  private getAttributesSectionRowParts(name: string): string[] {
    for (const row of this.attributesSectionRows) {
      const attributeParts = StructureShape.parseAttributesSectionRow(row);
      if (attributeParts[0] === name) {
        return attributeParts;
      }
    }
    throw new Error(`Attribute with name '${name}' not found`);
  }

  private addAttributesSectionRowAndEgressPort(variableColors: JointJsColors | undefined, name: string, value?: string): void {
    this.checkAttributesSectionRowsAndEgressPortsConsistency();
    this.patchAttributesSectionRows((rows) => {
      if (this.hasPort(name)) {
        throw new Error('Cannot add port: Duplicate port ID');
      }
      const index = this.egressPorts.length;
      this.addPort({
        ...StructureShape.createPort(StructureShape.egressPortGroupName, name),
        args: {
          y: this.getEgressPortY(index),
        },
        attrs: {
          ['.port-body']: { fill: variableColors?.fill },
        },
      });
      return [...rows, StructureShape.createAttributesSectionRow(name, value)];
    });
    this.checkAttributesSectionRowsAndEgressPortsConsistency();
  }

  private updateAttributesSectionRow(variableColors: JointJsColors | undefined, name: string, value?: string): void {
    this.checkAttributesSectionRowsAndEgressPortsConsistency();
    this.patchAttributesSectionRows((rows) => {
      for (let index = 0; index < rows.length; index++) {
        const [attributeName] = StructureShape.parseAttributesSectionRow(rows[index]);
        if (attributeName === name) {
          rows[index] = StructureShape.createAttributesSectionRow(name, value);
          return rows;
        }
      }
      throw new Error('Cannot update attribute: Attribute not found');
    });
    this.checkAttributesSectionRowsAndEgressPortsConsistency();
  }

  private removeAttributesSectionRowAndEgressPort(name: string): void {
    this.checkAttributesSectionRowsAndEgressPortsConsistency();
    this.patchAttributesSectionRows((rows) => {
      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const [attributeName] = StructureShape.parseAttributesSectionRow(row);
        if (attributeName === name) {
          if (!this.hasPort(name)) {
            throw new Error(`Cannot remove egress port: Port with name '${name}' not found`);
          }
          this.removePort(name);
          rows.splice(index, 1);
          return rows;
        }
      }
      throw new Error('Cannot remove attribute: Attribute not found');
    });
    this.checkAttributesSectionRowsAndEgressPortsConsistency();
  }

  //  Color update

  setColors(nodeColors: JointJsColors | undefined, variableColors: JointJsColors | undefined): void {
    this.attr('body', StructureShape.createGlobalColorUmlClassAttributesAttrs(nodeColors, variableColors));
  }

  //  Utilities :: Consistency checks

  private checkStructureId(id: string): void {
    const { structureId } = this;
    if (id !== structureId) {
      throw new Error(`Bad structure ID: '${id}'; expected: '${structureId}'`);
    }
  }

  private checkStructureIdForField({ parentId }: Pick<Field, 'parentId'>): void {
    this.checkStructureId(parentId);
  }

  private checkStructureIdForEgressReference({ startId }: Pick<Reference, 'startId'>): void {
    this.checkStructureId(startId);
  }

  private checkAttributesSectionRowsAndEgressPortsConsistency(): void {
    const names = new Set<string>();
    this.attributesSectionRows.forEach((attribute) => {
      const [name] = StructureShape.parseAttributesSectionRow(attribute);
      if (names.has(name)) {
        throw new Error(`Attributes and egress ports consistency check: Duplicate attribute name ('${name}')`);
      }
      names.add(name);
    });
    names.forEach((name) => {
      if (!this.hasPort(name)) {
        throw new Error(`Attributes and egress ports consistency check: No port defined for attribute with name '${name}'`);
      }
    });
    this.egressPorts.forEach((port) => {
      const id = port.id as string;
      if (!names.has(id)) {
        throw new Error(`Attribute and egress ports consistency check: No attribute defined for egress port with id '${id}'`);
      }
    });
  }
}
