import { Service } from '@toeverything/infra';

export interface ELVEnvelope<T = unknown> {
  ok: boolean;
  data?: T;
  error?: unknown;
}

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
      return {
        ok: false,
        error: 'Set localStorage["elv.vault"] before recording ELV events.',
      };
    }

    const response = await fetch(`${this.bridgeUrl}/event/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vault: this.vault,
        actor: 'affine',
        ...event,
      }),
    });

    return (await response.json()) as ELVEnvelope<{
      path: string;
      event: ELVLearningEventInput;
    }>;
  }
}
