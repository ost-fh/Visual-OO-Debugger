import { DebugSession } from 'vscode';
import { DebugProtocol } from 'vscode-debugprotocol';

export class DebugSessionProxy {
  private stackFrames: DebugProtocol.StackFrame[] | undefined;

  constructor(private readonly session: DebugSession) {}

  async loadStackFrames(threadId: number): Promise<void> {
    const stackTrace = await this.getStackTrace(threadId);
    this.stackFrames = stackTrace.stackFrames;
  }

  async getStackTrace(
    threadId: number,
    startFrame?: number,
    levels?: number
  ): Promise<{ totalFrames?: number; stackFrames: DebugProtocol.StackFrame[] }> {
    try {
      return (await this.session.customRequest('stackTrace', {
        threadId,
        levels,
        startFrame: startFrame ?? 0,
      })) as { totalFrames?: number; stackFrames: DebugProtocol.StackFrame[] };
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async getScopes(frameId?: number): Promise<DebugProtocol.Scope[]> {
    if (this.stackFrames === undefined || this.stackFrames.length === 0) {
      return [];
    }
    if (frameId === undefined) {
      frameId = this.stackFrames[0].id;
    }

    try {
      const reply = (await this.session.customRequest('scopes', { frameId })) as { scopes: DebugProtocol.Scope[] };
      if (!reply) {
        return [];
      }
      return reply.scopes;
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  async getVariables(variablesReference: number): Promise<DebugProtocol.Variable[]> {
    try {
      const reply = (await this.session.customRequest('variables', { variablesReference })) as { variables: DebugProtocol.Variable[] };
      if (!reply) {
        return [];
      }
      return reply.variables;
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  async getAllVariables(frameId?: number): Promise<DebugProtocol.Variable[]> {
    try {
      const scopes = await this.getScopes(frameId);
      const reply = await Promise.all(
        scopes.filter((s) => !s.expensive && s.name !== 'Global').map((s) => this.getVariables(s.variablesReference))
      );

      return reply.reduce((p, c) => p.concat(c));
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  getCallStack(): DebugProtocol.StackFrame[] | undefined {
    return this.stackFrames;
  }
}
