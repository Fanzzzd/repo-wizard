import { v4 as uuidv4 } from 'uuid';
import type { ChangeOperation } from '../bindings';

export type ReviewStatus = 'pending' | 'applied' | 'error' | 'identical';

export interface ReviewChange {
  id: string;
  operation: ChangeOperation;
  status: ReviewStatus;
}

export const createReviewChange = (
  operation: ChangeOperation
): ReviewChange => ({
  id: uuidv4(),
  operation,
  status: 'pending',
});
