import { ObjectDiagram } from '../../model/objectDiagram';

export interface ObjectDiagramReader<Source> {
  read(source: Source): ObjectDiagram;
}
