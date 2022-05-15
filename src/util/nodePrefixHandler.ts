const variablePrefix = 'variable_';
const objectPrefix = 'object_';
const nullPrefix = 'null_';

export const addVariablePrefix = (text: string): string => `${variablePrefix}${text}`;
export const addObjectPrefix = (text: string): string => `${objectPrefix}${text}`;
export const addNullPrefix = (text: string): string => `${nullPrefix}${text}`;

export const hasVariablePrefix = (text: string): boolean => text.startsWith(variablePrefix);
export const hasObjectPrefix = (text: string): boolean => text.startsWith(objectPrefix);
export const hasNullPrefix = (text: string): boolean => text.startsWith(nullPrefix);
