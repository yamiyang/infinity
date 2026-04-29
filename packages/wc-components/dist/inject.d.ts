/**
 * Build the complete wc-components runtime as a plain JS string.
 * Includes: global registry + base element + all 10 components.
 * Ready for injection via doc.write() or eval().
 */
declare function buildWCScript(): string;
/**
 * Build the registry-only script (minimal, for cases where you handle
 * components separately but need the token/done/error callbacks).
 */
declare function buildWCRegistryScript(): string;

export { buildWCRegistryScript, buildWCScript };
