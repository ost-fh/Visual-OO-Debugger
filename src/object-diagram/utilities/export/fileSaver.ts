import { writeFile } from 'fs/promises';
import { homedir } from 'os';
import { dirname } from 'path';
import { window } from 'vscode';
import { MementoAccessor } from '../storage/mementoAccessor';
import { SaveDialogOptionsFactory } from './saveDialogOptionsFactory';

export class FileSaver {
  constructor(
    private readonly saveDialogOptionsFactory: SaveDialogOptionsFactory,
    private readonly lastDirectoryAccessor: MementoAccessor<string>,
    private readonly fileNameStub: string,
    private readonly dataFactory: () => string
  ) {}

  async saveFile(): Promise<void> {
    const uri = await window.showSaveDialog(
      this.saveDialogOptionsFactory.createSaveDialogOptions(this.lastDirectoryAccessor.getValue() ?? homedir(), this.fileNameStub)
    );
    if (uri) {
      const { fsPath } = uri;
      await this.lastDirectoryAccessor.setValue(dirname(fsPath));
      await writeFile(fsPath, this.dataFactory());
    }
  }
}
