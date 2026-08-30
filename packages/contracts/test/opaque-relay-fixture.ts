import { relayEnvelopeSchema } from '../src/contracts.js';
import type { RelayEnvelope } from '../src/contracts.js';

interface RelayEvent {
  readonly event: 'stored' | 'pulled';
  readonly lookupId: string;
  readonly revision: number;
}

export class OpaqueRelayFixture {
  readonly #rows = new Map<string, RelayEnvelope>();
  readonly #events: RelayEvent[] = [];

  store(envelopeInput: unknown): void {
    const envelope = relayEnvelopeSchema.parse(envelopeInput);
    this.#rows.set(envelope.metadata.lookupId, structuredClone(envelope));
    this.#events.push({
      event: 'stored',
      lookupId: envelope.metadata.lookupId,
      revision: envelope.metadata.revision,
    });
  }

  pull(lookupId: string): RelayEnvelope {
    const envelope = this.#rows.get(lookupId);
    if (envelope === undefined) throw new Error('relay envelope not found');
    this.#events.push({
      event: 'pulled',
      lookupId,
      revision: envelope.metadata.revision,
    });
    return structuredClone(envelope);
  }

  snapshot(): { readonly rows: RelayEnvelope[]; readonly events: RelayEvent[] } {
    return {
      rows: structuredClone([...this.#rows.values()]),
      events: structuredClone(this.#events),
    };
  }
}
