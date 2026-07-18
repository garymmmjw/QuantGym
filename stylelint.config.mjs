export default {
  extends: ["stylelint-config-standard"],
  ignoreFiles: [
    "dist/**",
    "dist-preview/**",
    "dist-v2/**",
    "src/styles/**",
  ],
  rules: {
    "selector-class-pattern": [
      "^[a-z][a-zA-Z0-9]*$",
      { message: "Use locally scoped camelCase class names in V2 CSS Modules." },
    ],
  },
};
