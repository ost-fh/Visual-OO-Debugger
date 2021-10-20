import { DebugSession } from 'vscode';

export class DebugSessionProxy {
  public activeStackFrameId: number | undefined;
  constructor(public readonly session: DebugSession) {}
  
  public async setActiveStackFrameId(threadId: number){
    const stacTrace = await this.getStackTrace({
      threadId,
      startFrame: 0,
      levels: 1,
    });
    this.activeStackFrameId = stacTrace.stackFrames.length > 0 ? stacTrace.stackFrames[0].id : undefined;
  }

  public async getStackTrace(args: {
    threadId: number;
    startFrame?: number;
    levels?: number;
  }): Promise<{ totalFrames?: number; stackFrames: StackFrame[] }> {
    try {
      const reply = (await this.session.customRequest('stackTrace', {
        threadId: args.threadId,
        levels: args.levels,
        startFrame: args.startFrame || 0,
      })) as { totalFrames?: number; stackFrames: StackFrame[] };
      return reply;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  public async getScopes(args: { frameId: number }): Promise<Scope[]> {
    try {
      const reply = await this.session.customRequest('scopes', {
        frameId: args.frameId,
      });
      if (!reply) {
        return [];
      }
      return reply.scopes;
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  public async getVariables(args: {
    variablesReference: number;
  }): Promise<Variable[]> {
    try {
      const reply = await this.session.customRequest('variables', {
        variablesReference: args.variablesReference,
      });
      if (!reply) {
        return [];
      }
      return reply.variables;
    } catch (error) {
      console.error(error);
      return [];
    }
  }
}

interface Scope {
  name: string;
  expensive: boolean;
  variablesReference: number;
}

interface Variable {
  name: string;
  value: string;
  variablesReference: number;
}

interface StackFrame {
  id: number;
  name: string;
}
