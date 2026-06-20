import { Service } from '@toeverything/infra';

export type ELVEnvelope<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: unknown;
} & Partial<T>;

export interface ELVLearningEventInput {
  event_id?: string;
  actor?: string;
  verb: string;
  object_type: string;
  object_id: string;
  result_success?: boolean;
  result_score?: number;
  duration_minutes?: number;
  session_id?: string;
  attention_tier?: string;
  energy_state?: string;
  focus_state?: string;
  interruption_count?: number;
  north_star?: string;
}

export interface ELVLearnerState {
  state: Record<string, unknown> | null;
  scores: Record<string, number> | null;
}

export interface ELVReviewQueue {
  total_items: number;
  due_count: number;
  balanced_count: number;
  stats: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
}

export interface ELVMasteryResult {
  mastery: Record<string, unknown>;
}

const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:8765';

export class ELVService extends Service {
  get bridgeUrl() {
    return globalThis.localStorage?.getItem('elv.bridge.url') ?? DEFAULT_BRIDGE_URL;
  }

  get vault() {
    return globalThis.localStorage?.getItem('elv.vault') ?? '';
  }

  async health(): Promise<ELVEnvelope<{ service: string; version: string }>> {
    const response = await fetch(`${this.bridgeUrl}/health`);
    return (await response.json()) as ELVEnvelope<{
      service: string;
      version: string;
    }>;
  }

  async recordLearningEvent(
    event: ELVLearningEventInput
  ): Promise<ELVEnvelope<{ path: string; event: ELVLearningEventInput }>> {
    if (!this.vault) {
      return this.missingVault();
    }

    return this.postBridge('/event/add', {
      vault: this.vault,
      actor: 'affine',
      ...event,
    });
  }

  async learnerStateShow(): Promise<ELVEnvelope<ELVLearnerState>> {
    if (!this.vault) {
      return this.missingVault();
    }
    return this.postBridge('/learner-state/show', { vault: this.vault });
  }

  async reviewQueue(): Promise<ELVEnvelope<ELVReviewQueue>> {
    if (!this.vault) {
      return this.missingVault();
    }
    return this.postBridge('/review/queue', { vault: this.vault });
  }

  async masteryShow(atom: string): Promise<ELVEnvelope<ELVMasteryResult>> {
    if (!this.vault) {
      return this.missingVault();
    }
    return this.postBridge('/mastery/show', { vault: this.vault, atom });
  }

  async policyEvaluate(
    state: Record<string, unknown>
  ): Promise<ELVEnvelope<{ actions: Array<Record<string, unknown>> }>> {
    return this.postBridge('/policy/evaluate', { state });
  }

  async eventQuery(
    filters: Record<string, unknown> = {}
  ): Promise<ELVEnvelope<{ count: number; events: Array<Record<string, unknown>> }>> {
    if (!this.vault) {
      return this.missingVault();
    }
    return this.postBridge('/event/query', { vault: this.vault, ...filters });
  }

  async eventStats(
    options: Record<string, unknown> = {}
  ): Promise<ELVEnvelope<{ stats: Record<string, unknown>; aggregate: Record<string, unknown> }>> {
    if (!this.vault) {
      return this.missingVault();
    }
    return this.postBridge('/event/stats', { vault: this.vault, ...options });
  }

  private async postBridge<T>(
    path: string,
    body: Record<string, unknown>
  ): Promise<ELVEnvelope<T>> {
    const response = await fetch(`${this.bridgeUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return (await response.json()) as ELVEnvelope<T>;
  }

  private missingVault<T>(): ELVEnvelope<T> {
    return {
      ok: false,
      error: 'Set localStorage["elv.vault"] before using ELV bridge commands.',
    };
  }
}
