# Contribution

When contributing to this repository, please first discuss the change you wish to make via issue,
email, or any other method with the owners of this repository before making a change.

Please note we have a [Code of Conduct](CODE-OF-CONDUCT.md), please follow it in all your interactions with the project.

## Getting Started

### Issues

Issues should be used to report problems with the library, request a new feature, or to discuss potential changes
before a PR is created. When you create a new issue, a template will be loaded that will guide you through collecting
and providing the information we need to investigate.

If you find an issue that addresses the problem you're having, please add your own reproduction information to the
existing issue rather than creating a new one. Adding a [reaction][github-reaction] can also help to indicate to our
maintainers that a particular problem is affecting more than just the reporter.

[github-reaction]: https://github.blog/2016-03-10-add-reactions-to-pull-requests-issues-and-comments

### Pull Requests

PRs to our extension are always welcome and can be a quick way to get your fix or improvement slated for the next
release. In general, PRs should:

- Only fix/add the functionality in question **OR** address wide-spread whitespace/style issues, not both.
- Address a single concern in the least number of changed lines as possible.
- Be accompanied by a complete Pull Request template (loaded automatically when a PR is created).

In general, we follow the ["fork-and-pull" Git workflow](https://github.com/susam/gitpr):

1. Fork the repository to your own GitHub account
2. Clone the project to your machine
3. Create a branch locally with a succinct but descriptive name
4. Commit changes to the branch
5. Following the [code quality](#code-quality-tools) and [testing](#testing) guidelines
6. Push changes to your fork
7. Open a PR in our repository and follow the PR template so we can efficiently review the changes

## Documentation

If changes are made to the user interface, document the changes in the [README.md](README.md).

## IDE Setup

We highly recommend using [Visual Studio Code](https://code.visualstudio.com/) for developing this extension.
The following instructions are for development in VS Code.

When opening the project, you should get recommendations for three extensions (if not already installed). These
extensions are `dbaeumer.vscode-eslint`, `esbenp.prettier-vscode` and `amodio.tsl-problem-matcher`. If you don't get
the recommendations, install them manually from the Marketplace.

Launch the extension by pressing F5 or by running the `Run Extension` launch configuration.

## Testing

### Adding Tests

We use [mocha](https://mochajs.org/) as test runner library and [chai](https://www.chaijs.com/) as assertion library.

#### Installation and Integration

Installation and integration test files are expected to be located in the [test suite][test-suite] directory and to
have the file name extension `.test.ts` (e.g. [src/test/suite/extension.test.ts][extension-test]).

Please refer to the [official VS Code extension testing documentation][testing-doc] for guidelines and examples.

Please use this type of tests to test migrations between versions and interactions with other extensions as well.

[test-suite]: https://github.com/ost-fh/Visual-OO-Debugger/tree/master/src/test/suite
[extension-test]: https://github.com/ost-fh/Visual-OO-Debugger/blob/master/src/test/suite/extension.test.ts
[testing-doc]: https://code.visualstudio.com/api/working-with-extensions/testing-extension

#### Units

Unit test files are expected to be located in the [source][src] directory and to have the file name extension
`.spec.ts` (e.g. [src/object-diagram/model/escapedString.spec.ts][escaped-string-test]).

In most cases, a unit test file tests an implementation located in the same directory with a file of the same name, but
with the `.ts` file name extension (e.g. the file[src/object-diagram/model/escapedString.spec.ts][escaped-string-test]
tests the implementations in the file [src/object-diagram/model/escapedString.ts][escaped-string]).

[src]: https://github.com/ost-fh/Visual-OO-Debugger/tree/master/src
[escaped-string-test]: https://github.com/ost-fh/Visual-OO-Debugger/blob/master/src/object-diagram/model/escapedString.spec.ts
[escaped-string]: https://github.com/ost-fh/Visual-OO-Debugger/blob/master/src/object-diagram/model/escapedString.ts

### Running Tests

#### Installation and Integration

To run all extension installation and integration tests, execute the command `npm run test:ext`.
Use a virtual framebuffer such as Xvfb, if your environment does not provide a graphical interface
(e.g. `xvfb-run -a npm run test:ext`).

#### Units

To run all unit tests, execute the command `npm run test:spec`.

## Code Quality Tools

We use [Prettier](https://prettier.io/) for code formatting and [ESLint](https://eslint.org/) for linting.

### Prettier

Before you make a commit, execute `npm run format:write` to fix all issues found by Prettier. Alternatively run
`npm run format:check` to identify which files have issues and resolve them manually.

### ESLint

Before you make a commit, execute `npm run lint:fix` to fix all issues found by ESLint. Alternatively run
`npm run lint:check` to identify all issues and resolve them manually.

## CI Information

The GitHub CI pipeline runs Prettier and ESLint, and executes the tests. Follow the instructions described in
[Testing](#testing) and [Code quality tools](#code-quality-tools) for a successful CI.
