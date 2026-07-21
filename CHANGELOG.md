# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.7.0 - 2026-07-22

### Changed

- **BREAKING:** Replace the `TricoloreViz` instantiable class with a `Viz` utility class
  exposing `Viz.createContinuousPlot`, `Viz.createDiscretePlot`, and `Viz.createSextantPlot` as static methods,
  matching the other utility classes in the library.

- **BREAKING:** Rename `CompositionUtils.centre` to `CompositionUtils.center` to use American English spelling
  as in the rest of the library.

- Refactor to avoid defining some functions every time `hclToHex` is called and improve documentation about
  this color conversion.

### Fixed

- Avoid some edge cases that could generate NaN values (e.g., when all three components sum to zero).

## 0.6.0 - 2026-07-15

### Fixed

- Handling of null/empty values in input array of TernaryPoints in `tricolore` and `tricoloreSextant` functions.

## 0.5.0 - 2026-07-14

### Changed

- Improve sizing of the inner triangle in the `TricoloreViz` class (for "discrete" and "continuous" plots)
  to ensure it doesn't generate useless white space at the top of the plot.

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
