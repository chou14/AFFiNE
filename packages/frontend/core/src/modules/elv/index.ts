import type { Framework } from '@toeverything/infra';

import { WorkspaceScope } from '../workspace';
import { ELVService } from './services/elv';

export { ELVService };
export type {
  ELVEnvelope,
  ELVLearningEventInput,
  ELVLearnerState,
  ELVMasteryResult,
  ELVReviewQueue,
} from './services/elv';

export function configureELVModule(framework: Framework) {
  framework.scope(WorkspaceScope).service(ELVService);
}
