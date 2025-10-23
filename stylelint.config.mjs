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
    // - Only some rules in this category are enabled.
    "at-rule-no-vendor-prefix": true,
    "function-url-no-scheme-relative": true,
    "length-zero-no-unit": true,
    "media-feature-name-no-vendor-prefix": true,
    "property-no-vendor-prefix": true,
    "selector-no-vendor-prefix": true,
    "value-no-vendor-prefix": true,

    // Case
    // - All rules in this category are omitted.

    // Empty lines
    // - All rules in this category are omitted.

    // Max & min.
    "declaration-block-single-line-max-declarations": 0,

    // Notation
    // - All rules in this category are omitted.

    // Pattern
    // - All rules in this category are omitted.

    // Quotes
    "font-family-name-quotes": "always-unless-keyword",
    "function-url-quotes": "always",
    "selector-attribute-quotes": "always",

    // Redundant
    "block-no-redundant-nested-style-rules": true,
    "declaration-block-no-redundant-longhand-properties": true,
    "shorthand-property-no-redundant-values": true,

    // Whitespace inside
    "comment-whitespace-inside": "always",
  },
};
