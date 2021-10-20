import { debug, DebugSession } from 'vscode';
import { DebugSessionProxy } from './DebugSessionProxy';

export class DebugPrinter{
  public async printSession(session:DebugSessionProxy){
    const variableNames = new Array<string>();
    const scopes = await session.getScopes({
      frameId: session['activeStackFrameId'] ? session['activeStackFrameId']: 0,
    });
    
    const scopeVariables = await Promise.all(
      scopes
      .filter((s) => !s.expensive && s.name !== 'Global')
      .map((s) =>
      session.getVariables({
        variablesReference: s.variablesReference,
        })
      )
    );

    for (const variables of scopeVariables) {
      variableNames.push(
        ...variables
        .filter((v) => v.value !== 'undefined')
        .map((v) => v.name)
        );
      }
      console.log(variableNames);
    }
}