# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Fixed

- Corrects file path to type definitions in the `package.json` to ensure proper TypeScript support.

## 0.4.0 - 2026-07-13

### Changed

- BREAKING: Update the `createContinuousPlot`, `createDiscretePlot` and `createSextantPlot` methods of the `TricoloreViz`
  class to return the SVG element instead of adding to a given container. This allows users to directly manipulate
  or append the generated SVG to the DOM.

- Improve the `CompositionUtils.validateTernaryPoints` function to make it more flexible by allowing the user
  to select the tolerance to be taken into account during the comparison,
  as well as the value that the sum of the three components must meet.

## 0.3.0 - 2026-06-29

### Changed

- Remove the dependency on D3.js for the visualization component. The visualization can now be used without D3.js.

## 0.2.0 - 2026-06-29

### Changed

- Update dependencies to latest versions.
- Improve examples in README.
- Improve published package (minified and non-minified versions to help CDN usage).

## 0.1.0 - 2025-09-15

Initial release.
