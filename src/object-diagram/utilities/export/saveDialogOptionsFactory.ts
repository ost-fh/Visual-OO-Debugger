import { join } from 'path';
import { SaveDialogOptions, Uri } from 'vscode';

export class SaveDialogOptionsFactory {
  static create(format: string, defaultExtension: string, ...alternateExtensions: string[]): SaveDialogOptionsFactory {
    return new SaveDialogOptionsFactory(defaultExtension, {
      filters: {
        [format]: [defaultExtension, ...alternateExtensions],
      },
      title: `Save as ${format}`,
    });
  }

  private constructor(
    private readonly defaultExtension: string,
    private readonly basicOptions: Pick<SaveDialogOptions, 'filters' | 'title'>
  ) {}

  createSaveDialogOptions(directoryPath: string, fileNameStub: string): SaveDialogOptions {
    return {
      ...this.basicOptions,
      defaultUri: Uri.file(join(directoryPath, `${fileNameStub}.${this.defaultExtension}`)),
    };
  }
}
