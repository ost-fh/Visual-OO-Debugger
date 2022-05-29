import { dia, shapes } from 'jointjs';
import { JointJsColors } from '../model/jointJsColors';

export class ReferenceShape extends shapes.standard.Link {
  static create(source: dia.Link.EndJSON, target: dia.Link.EndJSON, colors: JointJsColors | undefined): ReferenceShape {
    return new ReferenceShape(this.createAttributes(source, target, colors));
  }

  private static createAttributes(
    source: dia.Link.EndJSON,
    target: dia.Link.EndJSON,
    colors: JointJsColors | undefined
  ): shapes.standard.LinkAttributes {
    return {
      attrs: {
        wrapper: {
          pointerEvents: 'none',
        },
        root: {
          ...colors,
        },
        line: {
          color: colors?.color,
          stroke: colors?.stroke,
        },
      },
      source: source,
      target: target,
      router: {
        name: 'manhattan',
        args: {
          excludeEnds: ['source', 'target'],
          startDirections: ['right'],
          endDirections: ['top'],
        },
      },
      connector: {
        name: 'rounded',
      },
    };
  }

  private constructor(attributes?: dia.Cell.Attributes, opt?: dia.Graph.Options) {
    super(attributes, opt);
  }

  //  Reference operations

  updateReference(target: dia.Link.EndJSON, colors: JointJsColors | undefined): void {
    this.target(target);
    this.colors = colors;
  }

  //  Color updates

  set colors(colors: JointJsColors | undefined) {
    const { color, stroke } = colors ?? {};
    this.attr('line', { color, stroke });
    this.attr('body', colors);
    this.attr('label/fill', color);
  }
}
