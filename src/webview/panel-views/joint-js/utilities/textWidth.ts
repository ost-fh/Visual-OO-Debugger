import { V } from 'jointjs';

//  This algorithm is loosely based on the definition of joint.util.measureText in
//  https://resources.jointjs.com/demos/rappid/apps/QAD/src/joint.shapes.qad.js
export const computeMaximalTextWidth = (document: Document, ...texts: string[]): number => {
  const svgDocument = V('svg').node;
  const textElement = V('<text><tspan></tspan></text>').node;
  const textSpan = textElement.firstChild as SVGTSpanElement;
  const textNode = document.createTextNode('');
  textSpan.appendChild(textNode);
  svgDocument.appendChild(textElement);
  document.body.appendChild(svgDocument);
  let width = 0;
  texts.forEach((text) => {
    textNode.data = text;
    width = Math.max(width, textSpan.getComputedTextLength());
  });
  V(svgDocument).remove();
  return width;
};
