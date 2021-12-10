//  Source: https://docs.oracle.com/javase/tutorial/java/nutsandbolts/datatypes.html
export enum PrimitiveJavaType {
  byte = 'byte',
  short = 'short',
  int = 'int',
  long = 'long',
  float = 'float',
  double = 'double',
  boolean = 'boolean',
  char = 'char',
}

export const isPrimitiveJavaType = (type: PrimitiveJavaType | string): type is PrimitiveJavaType => type in PrimitiveJavaType;
