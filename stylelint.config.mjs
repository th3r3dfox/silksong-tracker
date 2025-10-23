/** @type {import("stylelint").Config} */
export default {
  // https://stylelint.io/user-guide/rules
  rules: {
    // ------------
    // Avoid errors
    // ------------

    // Deprecated
    "at-rule-no-deprecated": true,
    "declaration-property-value-keyword-no-deprecated": true,
    "media-type-no-deprecated": true,
    "property-no-deprecated": true,

    // Descending
    "no-descending-specificity": true,

    // Duplicate
    "declaration-block-no-duplicate-custom-properties": true,
    /// "declaration-block-no-duplicate-properties": true,
    /// "font-family-no-duplicate-names": true,
    /// "keyframe-block-no-duplicate-selectors": true,
    /// "no-duplicate-at-import-rules": true,
    "no-duplicate-selectors": true,

    // Empty
    // TODO

    // Invalid
    // TODO

    // Irregular
    // TODO

    // Missing
    // TODO

    // Non-standard
    // TODO

    // Overrides
    // TODO

    // Unmatchable
    // TODO

    // Unknown
    // TODO

    // -------------------
    // Enforce conventions
    // -------------------

    // Allowed, disallowed & required
    // TODO

    // Case
    // TODO

    // Empty lines
    // TODO

    // Max & min.
    // TODO

    // Notation
    // TODO

    // Pattern
    // TODO

    // Quotes
    // TODO

    // Redundant
    // TODO

    // Whitespace inside
    // TODO
  },
};
