import * as path from 'path';
import { NodeModulesAccessor } from './src/node-modules-accessor/nodeModulesAccessor';
import { NodeModulesKeys } from './src/node-modules-accessor/nodeModulesKeys';
import { Configuration } from 'webpack';
import * as CopyPlugin from 'copy-webpack-plugin';

const outputPath = NodeModulesAccessor.outputPath;

const config: Configuration = {
  target: 'node', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/

  entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, outputPath),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]',
    clean: true,
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode', // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.extension.json',
            },
          },
        ],
      },
    ],
  },
  plugins: [copyNodeModulesFiles()],
};

const webviewConfig: Configuration = {
  target: 'web',
  entry: [
    //  TODO: VOOD-173: Register jointJsDebuggerPanel.ts
    //    'jointJs',
    //  TODO: VOOD-183: Register visjsDebuggerPanel.ts
    //    'visjs',
  ].reduce((entries, partialName) => {
    const name = `${partialName}DebuggerPanel`;
    return {
      ...entries,
      [name]: `./src/webview/panel-views/${name}.ts`,
    };
  }, {}),
  output: {
    path: path.resolve(__dirname, 'media', 'js'),
    filename: '[name].js',
    devtoolModuleFilenameTemplate: '../[resource-path]',
    clean: true,
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.webview.json',
            },
          },
        ],
      },
    ],
  },
};

function copyNodeModulesFiles(): CopyPlugin {
  const files: NodeModulesKeys[] = Object.keys(NodeModulesKeys)
    .filter((key) => !isNaN(Number(key)))
    .map((key) => Number(key));
  const copies: CopyPlugin.ObjectPattern[] = files.map((file) => {
    const value = NodeModulesAccessor.getPathToNodeModulesFile(file);
    let sourcePath;
    let destinationPath;
    if (value.includeFolder) {
      sourcePath = path.join(...value.sourcePath);
      destinationPath = path.join(...value.destinationPath);
    } else {
      sourcePath = path.join(...value.sourcePath, value.fileName);
      destinationPath = path.join(...value.destinationPath, value.fileName);
    }
    return {
      from: sourcePath,
      to: destinationPath,
    };
  });
  return new CopyPlugin({
    patterns: copies,
  });
}

module.exports = [config, webviewConfig];
