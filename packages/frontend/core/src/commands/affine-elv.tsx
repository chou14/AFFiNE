import { notify } from '@affine/component';

import type { ELVService } from '../modules/elv';
import { registerAffineCommand } from './registry';

export function registerAffineELVCommands({
  elvService,
}: {
  elvService: ELVService;
}) {
  const unsubs: Array<() => void> = [];

  unsubs.push(
    registerAffineCommand({
      id: 'affine:elv-health',
      category: 'affine:general',
      icon: <span>ELV</span>,
      label: {
        title: 'ELV: Check bridge health',
        subTitle: 'Verify the local ELV core HTTP bridge is available',
      },
      async run() {
        try {
          const result = await elvService.health();
          if (result.ok) {
            notify.success({ title: 'ELV bridge is available' });
            return;
          }
          notify.error({ title: 'ELV bridge health check failed' });
        } catch (error) {
          notify.error({
            title: 'ELV bridge is unavailable',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
    })
  );

  unsubs.push(
    registerAffineCommand({
      id: 'affine:elv-record-learning-event',
      category: 'affine:general',
      icon: <span>ELV</span>,
      label: {
        title: 'ELV: Record learning event',
        subTitle: 'Append an AFFiNE learning event into the configured ELV vault',
      },
      async run() {
        try {
          const result = await elvService.recordLearningEvent({
            event_id: `evt-affine-${Date.now()}`,
            verb: 'read_pass1',
            object_type: 'AFFiNE',
            object_id: globalThis.location?.href ?? 'affine-current-view',
            result_success: true,
          });

          if (result.ok) {
            notify.success({ title: 'ELV learning event recorded' });
            return;
          }

          notify.error({
            title: 'ELV learning event failed',
            message: String(result.error ?? 'Unknown ELV bridge error'),
          });
        } catch (error) {
          notify.error({
            title: 'ELV learning event failed',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
    })
  );

  return () => {
    unsubs.forEach(unsub => unsub());
  };
}
