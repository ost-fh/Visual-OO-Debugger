export class ContextManager<NameSpace extends string, Properties extends object> {
  constructor(private readonly nameSpace: NameSpace, private readonly setQualifiedValue: <T>(qualifiedName: string, value: T) => void) {}

  setValues<Name extends keyof Properties>(values: Pick<Properties, Name>): void {
    for (const name of Object.keys(values) as Name[]) {
      this.setValue(name, values[name]);
    }
  }

  setValue<Name extends keyof Properties>(name: Name, value: Properties[Name]): void {
    this.setQualifiedValue(`${this.nameSpace}.${String(name)}`, value);
  }
}
