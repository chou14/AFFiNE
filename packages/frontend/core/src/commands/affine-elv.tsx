import { notify } from '@affine/component';

import type { ELVService } from '../modules/elv';
import type { WorkspacesService } from '../modules/workspace';
import { registerAffineCommand } from './registry';

function currentAffineObjectId() {
  return globalThis.location?.href ?? 'affine-current-view';
}

function stringifyCompact(value: unknown) {
  return JSON.stringify(value, null, 2)?.slice(0, 800) ?? '';
}

export function registerAffineELVCommands({
  elvService,
  workspacesService,
}: {
  elvService: ELVService;
  workspacesService: WorkspacesService;
}) {
  const unsubs: Array<() => void> = [];

  unsubs.push(
    registerAffineCommand({
      id: 'affine:elv-create-primary-workspace',
      category: 'affine:general',
      icon: <span>ELV</span>,
      label: {
        title: 'ELV: Create AFFiNE primary workspace',
        subTitle: 'Create an AFFiNE workspace stored through the ELV workspace flavour',
      },
      async run() {
        try {
          const metadata = await workspacesService.create('elv', async workspace => {
            workspace.meta.initialize();
            workspace.doc.getMap('meta').set('name', 'ELV Workspace');
          });
          notify.success({
            title: 'ELV AFFiNE workspace created',
            message: `${metadata.flavour}:${metadata.id}`,
          });
        } catch (error) {
          notify.error({
            title: 'ELV workspace creation failed',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
    })
  );

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
            object_id: currentAffineObjectId(),
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

  unsubs.push(
    registerAffineCommand({
      id: 'affine:elv-show-learner-state',
      category: 'affine:general',
      icon: <span>ELV</span>,
      label: {
        title: 'ELV: Show learner state',
        subTitle: 'Read the latest ELV learner state from the configured vault',
      },
      async run() {
        try {
          const result = await elvService.learnerStateShow();
          if (result.ok) {
            notify.success({
              title: 'ELV learner state',
              message: stringifyCompact(result),
            });
            return;
          }
          notify.error({
            title: 'ELV learner state failed',
            message: String(result.error ?? 'Unknown ELV bridge error'),
          });
        } catch (error) {
          notify.error({
            title: 'ELV learner state failed',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
    })
  );

  unsubs.push(
    registerAffineCommand({
      id: 'affine:elv-show-review-queue',
      category: 'affine:general',
      icon: <span>ELV</span>,
      label: {
        title: 'ELV: Show review queue',
        subTitle: 'Read due FSRS review items from the configured ELV vault',
      },
      async run() {
        try {
          const result = await elvService.reviewQueue();
          if (result.ok) {
            notify.success({
              title: `ELV review queue: ${result.due_count ?? 0} due`,
              message: stringifyCompact(result.items ?? []),
            });
            return;
          }
          notify.error({
            title: 'ELV review queue failed',
            message: String(result.error ?? 'Unknown ELV bridge error'),
          });
        } catch (error) {
          notify.error({
            title: 'ELV review queue failed',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
    })
  );

  unsubs.push(
    registerAffineCommand({
      id: 'affine:elv-show-current-mastery',
      category: 'affine:general',
      icon: <span>ELV</span>,
      label: {
        title: 'ELV: Show mastery for current page',
        subTitle: 'Use the current AFFiNE URL as the ELV atom identifier',
      },
      async run() {
        try {
          const result = await elvService.masteryShow(currentAffineObjectId());
          if (result.ok) {
            notify.success({
              title: 'ELV mastery',
              message: stringifyCompact(result.mastery),
            });
            return;
          }
          notify.error({
            title: 'ELV mastery failed',
            message: String(result.error ?? 'Unknown ELV bridge error'),
          });
        } catch (error) {
          notify.error({
            title: 'ELV mastery failed',
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
