import { PanelViewColors } from '../../../../model/panelViewInput';
import { getJointJsColors, JointJsColors } from './jointJsColors';

export type JointJsPanelViewColors = Record<keyof PanelViewColors, JointJsColors>;

export const getJointJsPanelViewColors = (colors: PanelViewColors): JointJsPanelViewColors => ({
  defaultNodeColor: getJointJsColors(colors.defaultNodeColor),
  defaultVariableColor: getJointJsColors(colors.defaultVariableColor),
  changedNodeColor: getJointJsColors(colors.changedNodeColor),
  changedVariableColor: getJointJsColors(colors.changedVariableColor),
});
