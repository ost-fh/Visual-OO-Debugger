import { DebugSession } from 'vscode';
import { Scope } from '../model/scope';
import { StackFrame } from '../model/stackFrame';
import { Variable } from '../model/variable';

export class DebugSessionProxy {
  private activeStackFrameId: number | undefined;

  constructor(private readonly session: DebugSession) {}

  async setActiveStackFrameId(threadId: number): Promise<void> {
    const stackTrace = await this.getStackTrace(threadId, 0, 1);
    this.activeStackFrameId = stackTrace.stackFrames.length > 0 ? stackTrace.stackFrames[0].id : undefined;
  }

  async getStackTrace(
    threadId: number,
    startFrame?: number,
    levels?: number
  ): Promise<{ totalFrames?: number; stackFrames: StackFrame[] }> {
    try {
      return (await this.session.customRequest('stackTrace', {
        threadId,
        levels,
        startFrame: startFrame ?? 0,
      })) as { totalFrames?: number; stackFrames: StackFrame[] };
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async getScopes(frameId: number): Promise<Scope[]> {
    try {
      const reply = (await this.session.customRequest('scopes', { frameId })) as { scopes: Scope[] };
      if (!reply) {
        return [];
      }
      return reply.scopes;
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  async getAllCurrentScopes(): Promise<Scope[]> {
    if (this.activeStackFrameId === undefined) {
      return [];
    }
    try {
      const reply = (await this.session.customRequest('scopes', {
        frameId: this.activeStackFrameId,
      })) as { scopes: Scope[] };
      if (!reply) {
        return [];
      }
      return reply.scopes;
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  async getVariables(variablesReference: number): Promise<Variable[]> {
    try {
      const reply = (await this.session.customRequest('variables', { variablesReference })) as { variables: Variable[] };
      if (!reply) {
        return [];
      }
      return reply.variables;
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  async getAllCurrentVariables(): Promise<Variable[]> {
    try {
      const scopes = await this.getAllCurrentScopes();
      const reply = await Promise.all(
        scopes.filter((s) => !s.expensive && s.name !== 'Global').map((s) => this.getVariables(s.variablesReference))
      );

      return reply.reduce((p, c) => p.concat(c));
    } catch (error) {
      console.error(error);
      return [];
    }
  }
}
