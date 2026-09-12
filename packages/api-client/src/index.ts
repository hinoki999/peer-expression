/**
 * The ONLY path from the app to any backend.
 * Swapping the binding touches this package and nothing else.
 */
export type { ApiClient } from '@pe/shared';
export { createMockAdapter } from './adapters/mock/index.ts';
