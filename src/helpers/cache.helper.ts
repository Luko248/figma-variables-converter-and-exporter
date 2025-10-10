/**
 * Caching utilities for performance optimization
 */

import { MAX_CACHE_SIZE, MAX_POOL_SIZE } from "../constants/conversion.constants";
import { ProcessedVariable } from "../types/index";

/** Cache for CSS variable names */
const cssNameCache = new Map<string, string>();

/** Object pool for variable processing */
const variablePool: ProcessedVariable[] = [];

/**
 * Gets cached CSS variable name or stores new one
 */
export const getCachedCSSVariableName = (
  collectionName: string,
  variableName: string,
  generator: (collectionName: string, variableName: string) => string
): string => {
  const cacheKey = `${collectionName}:${variableName}`;

  if (cssNameCache.has(cacheKey)) {
    return cssNameCache.get(cacheKey)!;
  }

  const cssName = generator(collectionName, variableName);

  // Limit cache size to prevent memory leaks
  if (cssNameCache.size < MAX_CACHE_SIZE) {
    cssNameCache.set(cacheKey, cssName);
  }

  return cssName;
};

/**
 * Gets a variable object from the pool or creates a new one
 */
export const getPooledVariableObject = (): ProcessedVariable => {
  return variablePool.pop() || {
    name: '',
    value: '',
    type: '',
    variable: null
  };
};

/**
 * Returns a variable object to the pool for reuse
 */
export const returnToPool = (obj: ProcessedVariable): void => {
  // Reset object properties
  obj.name = '';
  obj.value = '';
  obj.type = '';
  obj.variable = null;

  // Return to pool (limit pool size to prevent memory leaks)
  if (variablePool.length < MAX_POOL_SIZE) {
    variablePool.push(obj);
  }
};

/**
 * Clears all caches
 */
export const clearAllCaches = (): void => {
  cssNameCache.clear();
  variablePool.length = 0;
  console.log("🧹 Memory cleanup completed");
};

/**
 * Maintained for backward compatibility
 */
export const clearColorCache = (): void => {
  // No-op with HSL conversion (no color cache needed)
};
