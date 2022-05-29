import { dia } from 'jointjs';

export class Shape extends dia.Element {
  markup = [
    {
      tagName: 'rect',
      selector: 'body',
    },
    {
      tagName: 'text',
      selector: 'label',
    },
  ];

  defaults(): Partial<dia.Element.Attributes> {
    return {
      z: 2,
      size: {
        width: 100,
        height: 50,
      },
      attrs: {
        body: {
          refWidth: '100%',
          refHeight: '100%',
          fill: 'ivory',
          stroke: 'gray',
          strokeWidth: 2,
          rx: 10,
          ry: 10,
        },
        label: {
          refX: '50%',
          refY: '50%',
          yAlignment: 'middle',
          xAlignment: 'middle',
          fontSize: 30,
        },
      },
    };
  }

  setText(text: string): this {
    return this.attr('label/text', text || '');
  }
}
