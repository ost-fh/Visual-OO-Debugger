import { NodeModulesKeys } from './nodeModulesKeys';
import { NodeModulesValue } from './nodeModulesValue';

export class NodeModulesAccessor {
  static readonly outputPath = 'dist';

  private static readonly pathMapping = new Map<NodeModulesKeys, NodeModulesValue>([
    [
      NodeModulesKeys.visNetworkMinJs,
      {
        sourcePath: ['node_modules', 'vis-network', 'standalone', 'umd'],
        destinationPath: ['libs', 'vis-network', 'standalone', 'umd'],
        fileName: 'vis-network.min.js',
      },
    ],
    [
      NodeModulesKeys.ffmpegMinJs,
      {
        sourcePath: ['node_modules', '@ffmpeg', 'ffmpeg', 'dist'],
        destinationPath: ['libs', '@ffmpeg', 'ffmpeg', 'dist'],
        fileName: 'ffmpeg.min.js',
      },
    ],
    [
      NodeModulesKeys.ffmpegCoreJs,
      {
        sourcePath: ['node_modules', '@ffmpeg', 'core', 'dist'],
        destinationPath: ['libs', '@ffmpeg', 'core', 'dist'],
        fileName: 'ffmpeg-core.js',
        includeFolder: true,
      },
    ],
    [
      NodeModulesKeys.codiconCss,
      {
        sourcePath: ['node_modules', '@vscode', 'codicons', 'dist'],
        destinationPath: ['libs', '@vscode', 'codicons', 'dist'],
        fileName: 'codicon.css',
        includeFolder: true,
      },
    ],
  ]);

  static getPathToOutputFile(key: NodeModulesKeys): string[] {
    const path = this.getMappedValue(key);
    return [this.outputPath, ...path.destinationPath, path.fileName];
  }

  static getPathToNodeModulesFile(key: NodeModulesKeys): NodeModulesValue {
    return this.getMappedValue(key);
  }

  private static getMappedValue(key: NodeModulesKeys): NodeModulesValue {
    const value = this.pathMapping.get(key);
    if (!value) {
      throw Error(`Path to "${key}" is not mapped.`);
    }
    return value;
  }
}
