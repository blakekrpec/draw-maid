/**
 * Public API of the framework-free core.
 *
 * UI code should import diagram logic from here (`../core`) rather than reaching
 * into individual files, so the internal layout can change freely.
 */
export * from './model/types';
export * from './model/ids';
export * from './serialize';
export * from './parse';
