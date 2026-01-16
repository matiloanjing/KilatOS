/**
 * Cache System Index
 * 
 * Exports all cache-related modules.
 * 
 * Copyright © 2026 KilatCode Studio
 */

export { responseCache, ResponseCache } from '@/lib/agents/codegen/response-cache';
export { semanticCache } from './semantic-cache';
export { prefetchRelatedPatterns, getPredictedQueries, getPrefetchStats } from './prefetch';
export { promptCache, initializePromptCache } from './prompt-cache';
