/*!
 * Convert JS SDK
 * Version 1.0.0
 * Copyright(c) 2020 Convert Insights, Inc
 * License Apache-2.0
 */
import Murmurhash from 'murmurhash';

/**
 * String formatter tool. Use %s for string %d for digit and %j for JSON formatting
 * @param {string} template
 * @param {Array<string>} args
 * @return {string}
 */
export function stringFormat(template: string, ...args: any[]): string {
  if (args.length) {
    let i = 0;
    return template
      .replace(
        /(%?)(%([sj]))/g,
        (match: string, p1: string, p2: string, p3: string): string => {
          if (p1) {
            return match;
          }
          const arg = args[i++];
          const val = typeof arg === 'function' ? arg() : arg;
          switch (p3) {
            case 's':
              return String(val);
            case 'j':
              return JSON.stringify(val);
          }
        }
      )
      .replace('%%', '%');
  }
  return String(template);
}

/**
 * String formatter tool. Transforms a space-separated string into camelCase
 * @param {string} input
 * @return {string}
 */
export function camelCase(input: string): string {
  return input
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
}

/**
 * Generate numeric hash based on seed
 * @param {string} value
 * @param {number=} seed
 * @return {number}
 */
export function generateHash(value: string, seed = 9999): number {
  return Murmurhash.v3(String(value), seed);
}
