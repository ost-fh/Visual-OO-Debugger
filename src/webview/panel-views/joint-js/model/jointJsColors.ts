import { NodeColor } from '../../../../model/panelViewInput';

export type JointJsColors = Partial<Record<'color' | 'fill' | 'stroke', string>>;

export const getJointJsColors = ({ background, border, font }: NodeColor): JointJsColors => ({
  color: font,
  fill: background,
  stroke: border,
});
