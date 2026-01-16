/**
 * KilatCore - Main Exports
 * 
 * Central hub for the KilatOS architecture.
 * 
 * Copyright © 2026 KilatCode Studio
 */

// Core OS
export { KilatOS, kilatOS } from './kilat-os';
export type { OSConfig, RoutingResult } from './kilat-os';

// App Protocol
export { BaseKilatApp } from './kilat-app';
export type { KilatApp, KilatResponse, KilatContext, KilatResponseType } from './kilat-app';

// App Wrappers (lazy-loaded to avoid circular deps)
export { initializeApps } from './app-registry';
