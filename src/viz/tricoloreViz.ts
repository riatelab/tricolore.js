import type { PlotDimensions, TernaryPoint, TernaryVertex, VisualizationOptions } from '../types';
import { TernaryGeometry } from '../core/ternaryGeometry';
import { ColorMapping } from '../core/colorMapping';
import { CompositionUtils } from '../core/compositionUtils';

// Helper constant for the height of an equilateral triangle with side length 1
const H_EQ = Math.sqrt(3) / 2;

const DEFAULT_DIMENSIONS: PlotDimensions = {
  width: 360,
  height: 360,
  margin: { top: 20, right: 20, bottom: 20, left: 20 },
};

interface SvgLayers {
  svg: SVGSVGElement;
  triangle: SVGGElement;
  legend: SVGGElement;
  circles: SVGGElement;
}

function createSvgLayers(
  width: number,
  height: number,
  margin: PlotDimensions['margin']
): SvgLayers {
  const svg = createSvgElement('svg', { width, height }) as SVGSVGElement;

  const triangle = createSvgElement('g', {
    transform: `translate(${margin.left},${margin.top})`,
  }) as SVGGElement;
  svg.appendChild(triangle);

  const legend = createSvgElement('g', {
    transform: `translate(${margin.left},${margin.top})`,
  }) as SVGGElement;
  svg.appendChild(legend);

  const circles = createSvgElement('g', {
    transform: `translate(${margin.left},${margin.top})`,
  }) as SVGGElement;
  svg.appendChild(circles);

  return { svg, triangle, legend, circles };
}

/**
 * Groups an array of items into a nested Map based on one or more key functions.
 * Mimics the behavior of d3.group.
 *
 * @param data - The flat array of items to group
 * @param keys - One or more accessor functions that return the grouping key for each item
 * @returns A nested Map where each level corresponds to one key function
 */
function group<T>(data: T[], ...keys: ((item: T) => unknown)[]): Map<unknown, unknown> {
  // Base case: no keys provided, return the data as-is
  if (keys.length === 0) return new Map();

  const [firstKey, ...restKeys] = keys;
  const map = new Map<unknown, unknown>();

  // Group items by the first key
  for (const item of data) {
    const k = firstKey(item);
    if (!map.has(k)) map.set(k, []);
    (map.get(k) as T[]).push(item);
  }

  // Recursively group by remaining keys
  if (restKeys.length > 0) {
    for (const [k, values] of map) {
      map.set(k, group(values as T[], ...restKeys));
    }
  }

  return map;
}

/**
 * Helper to create an SVG element with a given tag and attributes
 */
function createSvgElement(
  tag: string,
  attrs: Record<string, string | number | null> = {}
): SVGElement {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== null) {
      el.setAttribute(key, String(value));
    }
  }
  return el;
}

/**
 * Compute dimensions for an equilateral ternary triangle.
 * - plotSize = side length (also the triangle width in this coordinate system)
 * - triangleHeight = sqrt(3)/2 * plotSize
 *
 * Ensures both dimensions fit into available plotting area.
 */
function getPlotDimensions(
  plotWidth: number,
  plotHeight: number
): { plotSize: number; triangleHeight: number } {
  const maxSizeFromHeight = (2 / Math.sqrt(3)) * plotHeight;
  const plotSize = Math.min(plotWidth, maxSizeFromHeight);
  const triangleHeight = H_EQ * plotSize;
  return { plotSize, triangleHeight };
}

/**
 * Convert ternary coordinates to SVG coordinates
 */
function ternaryToSvgCoords(p: TernaryPoint, width: number, height: number): [number, number] {
  const [x, y] = TernaryGeometry.ternaryToCartesian(p);
  // y from ternaryToCartesian is in [0, sqrt(3)/2] for an equilateral triangle of side 1
  return [x * width, (1 - y / H_EQ) * height];
}

/**
 * Convert SVG coordinates to ternary coordinates
 */
function svgToTernaryCoords(point: [number, number], width: number, height: number): TernaryPoint {
  const x = point[0] / width;
  const y = (1 - point[1] / height) * H_EQ;
  return TernaryGeometry.cartesianToTernary(x, y);
}

/**
 * Draw the continuous colored triangle on canvas
 */
function drawContinuousTriangle(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  center: TernaryPoint,
  hue: number,
  chroma: number,
  lightness: number,
  contrast: number,
  spread: number
): void {
  const imageData = ctx.createImageData(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Convert from pixel coordinates to ternary coordinates
      const [p1, p2, p3] = svgToTernaryCoords([x, y], width, height);

      // Skip pixels outside the triangle
      if (p1 < 0 || p2 < 0 || p3 < 0 || p1 > 1 || p2 > 1 || p3 > 1) {
        continue;
      }

      // Calculate color for this point
      const color = ColorMapping.colorMapTricolore(
        [[p1, p2, p3]],
        center,
        100,
        hue,
        chroma,
        lightness,
        contrast,
        spread
      )[0];

      // Parse the hex color
      const r = parseInt(color.rgb!.slice(1, 3), 16);
      const g = parseInt(color.rgb!.slice(3, 5), 16);
      const b = parseInt(color.rgb!.slice(5, 7), 16);

      // Set the pixel color
      const pixelIndex = (y * width + x) * 4;
      imageData.data[pixelIndex] = r;
      imageData.data[pixelIndex + 1] = g;
      imageData.data[pixelIndex + 2] = b;
      imageData.data[pixelIndex + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Draw the triangle frame, axes and labels
 */
function drawTriangleFrame(
  layers: Pick<SvgLayers, 'triangle' | 'legend'>,
  width: number,
  height: number,
  labels: [string, string, string],
  center: TernaryPoint,
  showCenter: boolean,
  showLines: boolean,
  labelPosition: 'corner' | 'edge' = 'corner',
  rotateTickLabels: boolean = false
): void {
  // Define triangle corners in ternary coordinates
  // and convert to SVG coordinates
  const corners = [
    [1, 0, 0], // bottom left (p1)
    [0, 1, 0], // top (p2)
    [0, 0, 1], // bottom right (p3)
  ] as TernaryPoint[];

  const svgCorners = corners.map((p) => ternaryToSvgCoords(p, width, height));

  // Create the triangle border
  const points = svgCorners.map((p) => p.join(',')).join(' ');
  const border = createSvgElement('polygon', {
    points,
    fill: 'none',
    stroke: 'black',
    'stroke-width': 1,
  });
  layers.triangle.appendChild(border);

  // Add axis names
  if (labelPosition === 'edge') {
    const labelPositions = [
      [
        (svgCorners[0][0] + svgCorners[1][0]) / 2 - 35,
        (svgCorners[0][1] + svgCorners[1][1]) / 2 - 14,
      ], // p1
      [
        (svgCorners[1][0] + svgCorners[2][0]) / 2 + 35,
        (svgCorners[1][1] + svgCorners[2][1]) / 2 - 14,
      ], // p2
      [(svgCorners[0][0] + svgCorners[2][0]) / 2, (svgCorners[0][1] + svgCorners[2][1]) / 2 + 35], // p3
    ];

    const rotateValues = [-60, 60, 0];

    labels.forEach((label, i) => {
      const text = createSvgElement('text', {
        x: labelPositions[i][0],
        y: labelPositions[i][1],
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        transform: `rotate(${rotateValues[i]},${labelPositions[i][0]},${labelPositions[i][1]})`,
      });
      text.textContent = label;
      layers.legend.appendChild(text);
    });
  } else {
    // 'corner'
    const labelPositions = [
      [svgCorners[0][0], svgCorners[0][1] + 25], // p1
      [svgCorners[1][0], svgCorners[1][1] - 15], // p2
      [svgCorners[2][0], svgCorners[2][1] + 25], // p3
    ];

    labels.forEach((label, i) => {
      const text = createSvgElement('text', {
        x: labelPositions[i][0],
        y: labelPositions[i][1],
        'text-anchor': 'middle',
      });
      text.textContent = label;
      layers.legend.appendChild(text);
    });
  }

  // Add grid lines and labels at 25%, 50%, 75% for each axis
  const gridValues = [0.25, 0.5, 0.75];

  if (showLines) {
    // p1 grid lines
    gridValues.forEach((val) => {
      const line = [
        ternaryToSvgCoords([val, 0, 1 - val], width, height),
        ternaryToSvgCoords([val, 1 - val, 0], width, height),
      ];

      layers.legend.appendChild(
        createSvgElement('line', {
          x1: line[0][0],
          y1: line[0][1],
          x2: line[1][0],
          y2: line[1][1],
          stroke: '#aaa',
          'stroke-width': 0.5,
          opacity: 0.7,
        })
      );
    });

    // p2 grid lines
    gridValues.forEach((val) => {
      const line = [
        ternaryToSvgCoords([0, val, 1 - val], width, height),
        ternaryToSvgCoords([1 - val, val, 0], width, height),
      ];

      layers.legend.appendChild(
        createSvgElement('line', {
          x1: line[0][0],
          y1: line[0][1],
          x2: line[1][0],
          y2: line[1][1],
          stroke: '#aaa',
          'stroke-width': 0.5,
          opacity: 0.7,
        })
      );
    });

    // p3 grid lines
    gridValues.forEach((val) => {
      const line = [
        ternaryToSvgCoords([1 - val, 0, val], width, height),
        ternaryToSvgCoords([0, 1 - val, val], width, height),
      ];

      layers.legend.appendChild(
        createSvgElement('line', {
          x1: line[0][0],
          y1: line[0][1],
          x2: line[1][0],
          y2: line[1][1],
          stroke: '#aaa',
          'stroke-width': 0.5,
          opacity: 0.7,
        })
      );
    });
  }

  // Show center point (+ extended lines from this center) if requested
  if (showCenter) {
    const [cx, cy] = ternaryToSvgCoords(center, width, height);

    const circle = createSvgElement('circle', {
      cx,
      cy,
      r: 3,
      fill: 'black',
      stroke: 'white',
    });
    layers.triangle.appendChild(circle);

    const p1Line = [
      ternaryToSvgCoords([center[0], 0, 1 - center[0]], width, height),
      ternaryToSvgCoords([center[0], 1 - center[0], 0], width, height),
    ];

    const p2Line = [
      ternaryToSvgCoords([0, center[1], 1 - center[1]], width, height),
      ternaryToSvgCoords([1 - center[1], center[1], 0], width, height),
    ];

    const p3Line = [
      ternaryToSvgCoords([0, 1 - center[2], center[2]], width, height),
      ternaryToSvgCoords([1 - center[2], 0, center[2]], width, height),
    ];

    [p1Line, p2Line, p3Line].forEach((line) => {
      layers.triangle.appendChild(
        createSvgElement('line', {
          x1: line[0][0],
          y1: line[0][1],
          x2: line[1][0],
          y2: line[1][1],
          stroke: 'black',
          'stroke-width': 0.5,
          opacity: 0.5,
        })
      );
    });
  }

  // Add labels along the grid lines (whether lines are shown or not)
  gridValues.forEach((val) => {
    // Grid values for component 1
    const line = [
      ternaryToSvgCoords([val, 1 - val, 0], width, height),
      ternaryToSvgCoords([val, 0, 1 - val], width, height),
    ];
    const text = createSvgElement('text', {
      x: line[0][0] - 5,
      y: line[0][1],
      'text-anchor': 'end',
      'font-size': '10px',
    });
    if (rotateTickLabels) {
      text.setAttribute('transform', `rotate(60, ${line[0][0] - 5}, ${line[0][1]})`);
    }
    text.textContent = `${val * 100}%`;
    layers.legend.appendChild(text);
  });

  gridValues.forEach((val) => {
    // Grid values for component 2
    const line = [
      ternaryToSvgCoords([0, val, 1 - val], width, height),
      ternaryToSvgCoords([1 - val, val, 0], width, height),
    ];
    const text = createSvgElement('text', {
      x: line[0][0] + 5,
      y: line[0][1],
      'text-anchor': 'start',
      'font-size': '10px',
    });
    // There is no rotation needed for ticks of 2nd component
    text.textContent = `${val * 100}%`;
    layers.legend.appendChild(text);
  });

  gridValues.forEach((val) => {
    // Grid values for component 3
    const line = [
      ternaryToSvgCoords([1 - val, 0, val], width, height),
      ternaryToSvgCoords([0, 1 - val, val], width, height),
    ];
    const text = createSvgElement('text', {
      x: line[0][0],
      y: line[0][1] + 12.5,
      'text-anchor': 'middle',
      'font-size': '10px',
    });
    if (rotateTickLabels) {
      text.setAttribute('transform', `rotate(-60, ${line[0][0]}, ${line[0][1] + 12.5})`);
    }
    text.textContent = `${val * 100}%`;
    layers.legend.appendChild(text);
  });
}

/**
 * Add data points to the visualization
 */
function addDataPoints(
  circles: SVGGElement,
  data: TernaryPoint[],
  width: number,
  height: number
): void {
  const closed = CompositionUtils.close([...data]);
  // Validate data (this will throw an error if invalid)
  CompositionUtils.validateTernaryPoints(closed);
  // TODO: decide if we want
  //  - to throw an error (current behavior)
  //  - to silently ignore invalid points
  //  - to filter out invalid points and warn about it
  //  - to warn and skip plotting points
  // try {
  //   CompositionUtils.validateTernaryPoints(data);
  // } catch (e) {
  //   console.warn('Invalid ternary points:', e);
  //   return;
  // }

  closed.forEach((p, i) => {
    if (p) {
      const [x, y] = ternaryToSvgCoords(p, width, height);

      const circle = createSvgElement('circle', {
        cx: x,
        cy: y,
        r: 2,
        fill: 'black',
        opacity: 0.5,
      });
      // Attach data as a property (replaces d3's .datum())
      (circle as SVGCircleElement & { __data__?: { point: TernaryPoint; id: number } }).__data__ = {
        point: p,
        id: i,
      };
      circles.appendChild(circle);
    }
  });
}

/**
 * Utility functions for visualizing ternary compositions
 */
export class Viz {
  /**
   * Create a continuous ternary plot using canvas
   *
   * @param data - Array of ternary points
   * @param options - Visualization options
   * @param dimensions - Visualization dimensions
   *
   * @throws Error - If showData is true and data contains invalid ternary points
   */
  static createContinuousPlot(
    data: TernaryPoint[] = [],
    options: Partial<VisualizationOptions> = {},
    dimensions: PlotDimensions = DEFAULT_DIMENSIONS
  ): SVGSVGElement {
    const {
      center = [1 / 3, 1 / 3, 1 / 3],
      hue = 80,
      chroma = 140,
      lightness = 80,
      contrast = 0.4,
      spread = 1,
      showData = true,
      showCenter = true,
      showLines = true,
      labels = ['p₁', 'p₂', 'p₃'],
      labelPosition = 'edge',
      rotateTickLabels = false,
    } = options;

    const {
      width = DEFAULT_DIMENSIONS.width,
      height = DEFAULT_DIMENSIONS.height,
      margin = DEFAULT_DIMENSIONS.margin,
    } = dimensions;
    const layers = createSvgLayers(width, height, margin);

    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const { plotSize, triangleHeight } = getPlotDimensions(plotWidth, plotHeight);

    // Create canvas for continuous color rendering (non-square: width != height)
    const canvas = document.createElement('canvas');
    const canvasWidth = Math.max(1, Math.round(plotSize));
    const canvasHeight = Math.max(1, Math.round(triangleHeight));
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('Failed to get 2D context for canvas');

    // Draw the colored triangle on canvas
    drawContinuousTriangle(
      ctx,
      canvasWidth,
      canvasHeight,
      center,
      hue,
      chroma,
      lightness,
      contrast,
      spread
    );

    // Position canvas
    const image = createSvgElement('image', {
      x: 0,
      y: 0,
      width: plotSize,
      height: triangleHeight,
      href: canvas.toDataURL(),
    });
    layers.triangle.appendChild(image);

    // Add triangle border and axes using SVG
    drawTriangleFrame(
      layers,
      plotSize,
      triangleHeight,
      labels,
      center,
      showCenter,
      showLines,
      labelPosition,
      rotateTickLabels
    );

    // Add data points if requested
    if (showData && data.length > 0) {
      addDataPoints(layers.circles, data, plotSize, triangleHeight);
    }

    return layers.svg;
  }

  /**
   * Create a discrete ternary plot using SVG polygons
   *
   * @param data - Array of ternary points
   * @param options - Visualization options
   * @param dimensions - Visualization dimensions
   *
   * @throws Error - If showData is true and data contains invalid ternary points
   */
  static createDiscretePlot(
    data: TernaryPoint[] = [],
    options: Partial<VisualizationOptions> = {},
    dimensions: PlotDimensions = DEFAULT_DIMENSIONS
  ): SVGSVGElement {
    const {
      center = [1 / 3, 1 / 3, 1 / 3],
      breaks = 4,
      hue = 80,
      chroma = 140,
      lightness = 80,
      contrast = 0.4,
      spread = 1,
      showData = true,
      showCenter = true,
      showLines = true,
      labels = ['p₁', 'p₂', 'p₃'],
      labelPosition = 'edge',
      rotateTickLabels = false,
    } = options;

    const {
      width = DEFAULT_DIMENSIONS.width,
      height = DEFAULT_DIMENSIONS.height,
      margin = DEFAULT_DIMENSIONS.margin,
    } = dimensions;
    const layers = createSvgLayers(width, height, margin);

    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const { plotSize, triangleHeight } = getPlotDimensions(plotWidth, plotHeight);

    // Generate mesh centroids and vertices
    const centroids = TernaryGeometry.ternaryMeshCentroids(breaks);
    const vertices = TernaryGeometry.ternaryMeshVertices(centroids);

    // Calculate colors for each centroid
    const centroidPoints = centroids.map((c) => [c.p1, c.p2, c.p3] as TernaryPoint);
    const colors = ColorMapping.colorMapTricolore(
      centroidPoints,
      center,
      100,
      hue,
      chroma,
      lightness,
      contrast,
      spread
    );

    // Group vertices by triangle id
    const triangleGroups = group(vertices, (d: TernaryVertex) => d.id);

    // Create a polygon for each triangle
    triangleGroups.forEach((triangleVertices, id: unknown) => {
      const points = (triangleVertices as TernaryVertex[])
        .map((v: TernaryVertex) => {
          const [x, y] = ternaryToSvgCoords([v.p1, v.p2, v.p3], plotSize, triangleHeight);
          return `${x},${y}`;
        })
        .join(' ');

      const color = colors[Number(id) - 1].rgb;

      const polygon = createSvgElement('polygon', {
        points,
        fill: color,
        stroke: 'none',
      });
      layers.triangle.appendChild(polygon);
    });

    // Draw triangle border and axes
    drawTriangleFrame(
      layers,
      plotSize,
      triangleHeight,
      labels,
      center,
      showCenter,
      showLines,
      labelPosition,
      rotateTickLabels
    );

    // Add data points if requested
    if (showData && data.length > 0) {
      addDataPoints(layers.circles, data, plotSize, triangleHeight);
    }

    return layers.svg;
  }

  /**
   * Create a sextant ternary plot
   *
   * @param data - Array of ternary points
   * @param options - Visualization options
   * @param dimensions - Visualization dimensions
   *
   * @throws Error - If showData is true and data contains invalid ternary points
   */
  static createSextantPlot(
    data: TernaryPoint[] = [],
    options: Partial<VisualizationOptions> & { values?: string[] } = {},
    dimensions: PlotDimensions = DEFAULT_DIMENSIONS
  ): SVGSVGElement {
    const {
      center = [1 / 3, 1 / 3, 1 / 3],
      values = ['#FFFF00', '#B3DCC3', '#01A0C6', '#B8B3D8', '#F11D8C', '#FFB3B3'],
      showData = true,
      showCenter = true,
      showLines = true,
      labels = ['p₁', 'p₂', 'p₃'],
      labelPosition = 'edge',
      rotateTickLabels = false,
    } = options;

    if (values.length !== 6) {
      throw new Error('Sextant plot requires exactly 6 color values');
    }

    const {
      width = DEFAULT_DIMENSIONS.width,
      height = DEFAULT_DIMENSIONS.height,
      margin = DEFAULT_DIMENSIONS.margin,
    } = dimensions;
    const layers = createSvgLayers(width, height, margin);

    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const { plotSize, triangleHeight } = getPlotDimensions(plotWidth, plotHeight);

    // Generate sextant vertices
    const vertices = TernaryGeometry.ternarySextantVertices(center);

    // Group vertices by sextant id
    const sextantGroups = group(vertices, (d) => d.id);

    // Create a polygon for each sextant
    sextantGroups.forEach((sextantVertices, id: unknown) => {
      // Sort vertices by vertex id to ensure proper polygon drawing
      (sextantVertices as TernaryVertex[]).sort((a, b) => a.vertex - b.vertex);

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const points = (sextantVertices as TernaryVertex[])
        .map((v: TernaryVertex) => {
          const [x, y] = ternaryToSvgCoords([v.p1, v.p2, v.p3], plotSize, triangleHeight);
          return `${x},${y}`;
        })
        .join(' ') as string;

      const colorIndex = Number(id) - 1;

      const polygon = createSvgElement('polygon', {
        points,
        fill: values[colorIndex],
        stroke: 'none',
      });
      layers.triangle.appendChild(polygon);
    });

    // Draw triangle border and axes
    drawTriangleFrame(
      layers,
      plotSize,
      triangleHeight,
      labels,
      center,
      showCenter,
      showLines,
      labelPosition,
      rotateTickLabels
    );

    // Add data points if requested
    if (showData && data.length > 0) {
      addDataPoints(layers.circles, data, plotSize, triangleHeight);
    }

    return layers.svg;
  }
}
