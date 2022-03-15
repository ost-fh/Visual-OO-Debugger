import { config, expect } from 'chai';
import { readdirSync, readFileSync } from 'fs';
import { after, before, ExclusiveSuiteFunction, PendingSuiteFunction, SuiteFunction } from 'mocha';
import { join } from 'path';
import { ObjectDiagram } from '../model/objectDiagram';
import { ObjectDiagramReader } from './reader/objectDiagramReader';
import { PanelViewInputObjectDiagramReader } from './reader/panelViewInputObjectDiagramReader';
import { ObjectDiagramWriter } from './writer/objectDiagramWriter';
import { PlantUmlObjectDiagramWriter } from './writer/plantUmlObjectDiagramWriter';
import { GraphVizObjectDiagramWriter } from './writer/graphVizObjectDiagramWriter';
import { PanelViewInput, PanelViewInputVariableMap, PanelViewVariable } from '../../model/panelViewInput';

interface SuiteConfiguration {
  title: string;
  ignore: boolean;
  only: boolean;
}

const getSuiteFunction = ({ ignore, only }: SuiteConfiguration): PendingSuiteFunction | ExclusiveSuiteFunction | SuiteFunction => {
  if (ignore) {
    return xdescribe;
  }
  if (only) {
    return describe.only;
  }
  return describe;
};

const readUtf8FilesSync = (...paths: string[]): string[] => paths.map((path) => readFileSync(path, { encoding: 'utf-8' }));

const parseJsonFiles = <T extends unknown[]>(...paths: string[]): T =>
  readUtf8FilesSync(...paths).map((content) => JSON.parse(content) as unknown) as T;

const createSubPaths = <T extends string[]>(directoryPath: string, ...names: T): T => names.map((name) => join(directoryPath, name)) as T;

const loadPanelViewInputFromVariablesFile = (filePath: string): PanelViewInput => {
  const [panelViewVariables] = parseJsonFiles<[PanelViewVariable[]]>(filePath);
  const variables: PanelViewInputVariableMap = new Map<string, PanelViewVariable>();
  panelViewVariables.forEach((variable) => variables.set(variable.id, variable));
  return {
    callstack: [{ name: 'unnamed', variables }],
  };
};

const shouldReadTheObjectDiagramCorrectlyFromSource = <Source>(
  sourceName: string,
  reader: ObjectDiagramReader<Source>,
  source: Source,
  objectDiagram: ObjectDiagram
): void =>
  void it(`should read the object diagram correctly from ${sourceName}`, () => expect(reader.read(source)).to.deep.equal(objectDiagram));

const itShouldWriteTheObjectDiagramCorrectlyAsTarget = (
  targetName: string,
  writer: ObjectDiagramWriter,
  objectDiagram: ObjectDiagram,
  expected: string
): void =>
  void it(`should write the object diagram correctly as ${targetName}`, () => expect(writer.write(objectDiagram)).to.equal(expected));

describe('Object diagram logic', () => {
  let oldChaiConfigTruncateThreshold: number;
  before(() => {
    oldChaiConfigTruncateThreshold = config.truncateThreshold;
    config.truncateThreshold = 0;
  });
  after(() => {
    config.truncateThreshold = oldChaiConfigTruncateThreshold;
  });
  const [testSuitesDirectoryPath] = createSubPaths(__dirname, 'test-suites');
  readdirSync(testSuitesDirectoryPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .forEach((testSuiteDirectoryName) => {
      const [testSuiteDirectoryPath] = createSubPaths(testSuitesDirectoryPath, testSuiteDirectoryName);
      const [testSuiteFilePath, testsDirectoryPath] = createSubPaths(testSuiteDirectoryPath, 'test-suite.json', 'tests');
      const [testSuite] = parseJsonFiles<[SuiteConfiguration]>(testSuiteFilePath);
      getSuiteFunction(testSuite)(testSuite.title, () => {
        readdirSync(testsDirectoryPath, { withFileTypes: true })
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name)
          .forEach((testDirectoryName) => {
            const [testDirectoryPath] = createSubPaths(testsDirectoryPath, testDirectoryName);
            const [testFilePath, objectDiagramFilePath, readerDirectoryPath, writerDirectoryPath] = createSubPaths(
              testDirectoryPath,
              'test.json',
              'object-diagram.json',
              'reader',
              'writer'
            );
            const [test, objectDiagram] = parseJsonFiles<[SuiteConfiguration, ObjectDiagram]>(testFilePath, objectDiagramFilePath);
            const [
              //  Reader input file path variables
              panelViewVariablesFilePath,
            ] = createSubPaths(
              readerDirectoryPath,
              //  Reader input file names
              'panel-view-variables.json'
            );
            //  Reader inputs
            const panelViewInput = loadPanelViewInputFromVariablesFile(panelViewVariablesFilePath);
            const [
              //  Writer expectation variables
              expectedPlantUml,
              expectedGraphViz,
            ] = readUtf8FilesSync(
              ...createSubPaths(
                writerDirectoryPath,
                //  Writer expectation file names
                'expected.puml',
                'expected.gv'
              )
            );
            getSuiteFunction(test)(test.title, () => {
              //  Reader tests
              shouldReadTheObjectDiagramCorrectlyFromSource(
                'a panel view input',
                new PanelViewInputObjectDiagramReader(),
                panelViewInput,
                objectDiagram
              );
              //  Writer tests
              itShouldWriteTheObjectDiagramCorrectlyAsTarget(
                'PlantUml',
                new PlantUmlObjectDiagramWriter(),
                objectDiagram,
                expectedPlantUml
              );
              itShouldWriteTheObjectDiagramCorrectlyAsTarget(
                'GraphViz',
                new GraphVizObjectDiagramWriter(),
                objectDiagram,
                expectedGraphViz
              );
            });
          });
      });
    });
});
