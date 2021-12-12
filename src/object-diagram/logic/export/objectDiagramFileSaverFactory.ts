import { ObjectDiagram } from '../../model/objectDiagram';
import { FileSaver } from '../../utilities/export/fileSaver';
import { SaveDialogOptionsFactory } from '../../utilities/export/saveDialogOptionsFactory';
import { MementoAccessor } from '../../utilities/storage/mementoAccessor';
import { ObjectDiagramWriter } from '../writer/objectDiagramWriter';
import { PlantUmlObjectDiagramWriter } from '../writer/plantUmlObjectDiagramWriter';

export class ObjectDiagramFileSaverFactory {
  private static readonly fileNameStub = 'object-diagram';

  constructor(
    private readonly lastExportDirectoryPathAccessor: MementoAccessor<string>,
    private readonly objectDiagramFactory: () => ObjectDiagram
  ) {}

  createPlantUmlObjectDiagramFileSaver(): FileSaver {
    return this.createObjectDiagramFileSaver(
      SaveDialogOptionsFactory.create('PlantUML', 'puml', 'pu', 'plantuml', 'iuml', 'wsd'),
      new PlantUmlObjectDiagramWriter()
    );
  }

  private createObjectDiagramFileSaver(saveDialogOptionsFactory: SaveDialogOptionsFactory, writer: ObjectDiagramWriter): FileSaver {
    return new FileSaver(saveDialogOptionsFactory, this.lastExportDirectoryPathAccessor, ObjectDiagramFileSaverFactory.fileNameStub, () =>
      writer.write(this.objectDiagramFactory())
    );
  }
}
