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
    "declaration-block-no-duplicate-properties": true,
    "font-family-no-duplicate-names": true,
    "keyframe-block-no-duplicate-selectors": true,
    "no-duplicate-at-import-rules": true,
    "no-duplicate-selectors": true,

    // Empty
    "block-no-empty": true,
    "comment-no-empty": true,
    "no-empty-source": true,

    // Invalid
    "at-rule-prelude-no-invalid": true,
    "color-no-invalid-hex": true,
    "function-calc-no-unspaced-operator": true,
    "keyframe-declaration-no-important": true,
    "media-query-no-invalid": true,
    "named-grid-areas-no-invalid": true,
    "no-invalid-double-slash-comments": true,
    "no-invalid-position-at-import-rule": true,
    "no-invalid-position-declaration": true,
    "string-no-newline": true,
    "syntax-string-no-invalid": true,

    // Irregular
    "no-irregular-whitespace": true,

    // Missing
    "custom-property-no-missing-var-function": true,
    "font-family-no-missing-generic-family-keyword": true,
    "nesting-selector-no-missing-scoping-root": true,

    // Non-standard
    "function-linear-gradient-no-nonstandard-direction": true,

    // Overrides
    "declaration-block-no-shorthand-property-overrides": true,

    // Unmatchable
    "selector-anb-no-unmatchable": true,

    // Unknown
    "annotation-no-unknown": true,
    "at-rule-descriptor-no-unknown": true,
    "at-rule-descriptor-value-no-unknown": true,
    "at-rule-no-unknown": true,
    "declaration-property-value-no-unknown": true,
    "function-no-unknown": true,
    "media-feature-name-no-unknown": true,
    "media-feature-name-value-no-unknown": true,
    "no-unknown-animations": true,
    "no-unknown-custom-media": true,
    "no-unknown-custom-properties": true,
    "property-no-unknown": true,
    "selector-pseudo-class-no-unknown": true,
    "selector-pseudo-element-no-unknown": true,
    "selector-type-no-unknown": true,
    "unit-no-unknown": true,

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
