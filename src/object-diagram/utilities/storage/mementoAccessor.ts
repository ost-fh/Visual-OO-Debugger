import { Memento } from 'vscode';

export class MementoAccessor<Value> {
  constructor(private readonly memento: Memento, private readonly key: string) {}

  getValue(): Value | undefined {
    return this.memento.get(this.key);
  }

  setValue(value: Value): Thenable<void> {
    return this.memento.update(this.key, value);
  }
}
