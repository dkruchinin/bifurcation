// d3 zooming code is taken pretty much as is from
// https://github.com/xoor-io/d3-canvas-example/tree/master/03_scatterplot_with_box_zoom
const pointColor = '#3585ff'
const margin = {top: 20, right: 15, bottom: 60, left: 70};
const outerWidth = 800;
const outerHeight = 600;
const width = outerWidth - margin.left - margin.right;
const height = outerHeight - margin.top - margin.bottom;
const POINTS_TO_COLLECT = 1000;
const MAX_ITERATIONS = 50000;

let lastTransform = d3.zoomIdentity;
let lastSelection = null;
let bifurcation_simulation = null;

const container = d3.select('.bifurcation-container');

// Init SVG
const svg = container.append('svg:svg')
   .attr('width', outerWidth)
   .attr('height', outerHeight)
   .attr('class', 'svg-plot')
   .append('g')
   .attr('transform', `translate(${margin.left}, ${margin.top})`);

// Init Canvas
const canvas = container.append('canvas')
   .attr('width', width)
   .attr('height', height)
   .style('margin-left', margin.left + 'px')
   .style('margin-top', margin.top + 'px')
   .attr('class', 'canvas-plot');

const context = canvas.node().getContext('2d');

// Init Scales
const x = d3.scaleLinear()
  .domain([2.8, 4])
  .range([0, width])
  .nice();

const y = d3.scaleLinear()
  .domain([0, 1])
  .range([height, 0])
  .nice();

const xAxis = d3.axisBottom(x);
const yAxis = d3.axisLeft(y);

const gxAxis = svg.append('g')
   .attr('transform', `translate(0, ${height})`)
   .call(xAxis);

const gyAxis = svg.append('g')
   .call(yAxis);

// Add labels
svg.append('text')
   .attr('x', `-${height/2}`)
   .attr('dy', '-3.5em')
   .attr('transform', 'rotate(-90)')
   .text('x');

svg.append('text')
   .attr('x', `${width/2}`)
   .attr('y', `${height + 40}`)
   .text('r');


const brush = d3.brush().extent([[0, 0], [width, height]])
   .on("start", brush_startEvent)
   .on("brush", brush_brushEvent)
   .on("end", brush_endEvent)
   .on("start.nokey", function() {
      d3.select(window).on("keydown.brush keyup.brush", null);
   });

const svgChartParent = d3.select('svg');
canvas.style('z-index', 0);
svgChartParent.style('z-index', 1);
const brushSvg = svg.append("g")
   .attr("class", "brush")
   .call(brush);


function startBifurcationSimulation(transform) {
   lastTransform = transform;

   const scaleX = transform.rescaleX(x);
   const scaleY = transform.rescaleY(y);

   gxAxis.call(xAxis.scale(scaleX));
   gyAxis.call(yAxis.scale(scaleY));
   if (bifurcation_simulation != null) {
      clearInterval(bifurcation_simulation);
   }
   context.clearRect(0, 0, width, height);

   const r = scaleX.invert(0);
   const r_lim = scaleX.invert(width);
   const y0 = scaleY.invert(0);
   const y1 = scaleY.invert(height);

   let simulation_params = {
      scaleX: scaleX,
      scaleY: scaleY,
      r: r,
      r_lim: r_lim,
      dr: (r_lim - r) / 1000,
      x_low: Math.min(y0, y1),
      x_high: Math.max(y0, y1),
   };
   bifurcation_simulation = setInterval(bifurcation_iteration, 0, simulation_params);
}

const zoom_function = d3.zoom().scaleExtent([1, 1000])
.on('zoom', (event) => {
      const transform = event.transform;
      context.save();
      startBifurcationSimulation(transform);
      context.restore();
});

canvas.call(zoom_function);
startBifurcationSimulation(d3.zoomIdentity);


const toolsList = container.select('#bifurcation_reset').on("click", () => {
   const t = d3.zoomIdentity.translate(0, 0).scale(1);
   canvas.transition()
   .duration(200)
   .ease(d3.easeLinear)
   .call(zoom_function.transform, t)
});


let brushStartPoint = null;

function compute_orbit(r, x0, x_low, x_high) {
   const orbit = [];
   let x = x0;
   for (let i = 0; orbit.length < POINTS_TO_COLLECT && i < MAX_ITERATIONS; i++) {
      if ((i >= 1000) && (x >= x_low && x <= x_high)) {
         orbit.push([r, x]);
      }
      x = r * x * (1 - x);
   }

   return orbit;
}

function bifurcation_iteration(data) {
   const orbit = compute_orbit(
      data.r, Math.random(),
      data.x_low, data.x_high
   );
   for (let i = 0; i < orbit.length; i++) {
      drawPoint(orbit[i], data.scaleX, data.scaleY);
   }
   data.r += data.dr;
   if (data.r > data.r_lim) {
      clearInterval(bifurcation_simulation);
   }
}

function drawPoint(point, scaleX, scaleY) {
   const px = scaleX(point[0]);
   const py = scaleY(point[1]);

   context.beginPath();
   context.moveTo(px, py);
   context.fillStyle = pointColor;
   context.arc(px, py, 0.25, 0, 2 * Math.PI, true);
   context.fill();
}

function brush_startEvent(event) {
   if (event.sourceEvent === undefined) {
      return;
   }
   const sourceEvent = event.sourceEvent;
   const selection = event.selection;
   if (sourceEvent.type === 'mousedown') {
       brushStartPoint = {
           mouse: {
               x: sourceEvent.screenX,
               y: sourceEvent.screenY
           },
           x: selection[0][0],
           y: selection[0][1]
       }
   } else {
       brushStartPoint = null;
   }
}

function brush_brushEvent(event) {
   if (brushStartPoint !== null && event.sourceEvent !== undefined) {
       const scale = width / height;
       const sourceEvent = event.sourceEvent;
       const mouse = {
           x: sourceEvent.screenX,
           y: sourceEvent.screenY
       };
       if (mouse.x < 0) { mouse.x = 0; }
       if (mouse.y < 0) { mouse.y = 0; }
       let distance = mouse.y - brushStartPoint.mouse.y;
       let yPosition = brushStartPoint.y + distance;
       let xCorMulti = 1;

       if ((distance < 0 && mouse.x > brushStartPoint.mouse.x) || (distance > 0 && mouse.x < brushStartPoint.mouse.x)) {
           xCorMulti = -1;
       }

       if (yPosition > height) {
           distance = height - brushStartPoint.y;
           yPosition = height;
       } else if (yPosition < 0) {
           distance = -brushStartPoint.y;
           yPosition = 0;
       }

       let xPosition = brushStartPoint.x + distance * scale * xCorMulti;
       const oldDistance = distance;

       if (xPosition > width) {
           distance = (width - brushStartPoint.x) / scale;
           xPosition = width;
       } else if (xPosition < 0) {
           distance = brushStartPoint.x / scale;
           xPosition = 0;
       }

       if (oldDistance !== distance) {
           distance *= (oldDistance < 0) ? -1 : 1;
           yPosition = brushStartPoint.y + distance;
       }

       const selection = svg.select(".selection");

       const posValue = Math.abs(distance);
       selection.attr('width', posValue * scale).attr('height', posValue);

       if (xPosition < brushStartPoint.x) {
           selection.attr('x', xPosition);
       }
       if (yPosition < brushStartPoint.y) {
           selection.attr('y', yPosition);
       }

       const minX = Math.min(brushStartPoint.x, xPosition);
       const maxX = Math.max(brushStartPoint.x, xPosition);
       const minY = Math.min(brushStartPoint.y, yPosition);
       const maxY = Math.max(brushStartPoint.y, yPosition);

       lastSelection = { x1: minX, x2: maxX, y1: minY, y2: maxY };
   }
}


function brush_endEvent(event) {
   const s = event.selection;
   if (!s && lastSelection !== null) {
       // Re-scale axis for the last transformation
       let zx = lastTransform.rescaleX(x);
       let zy = lastTransform.rescaleY(y);

       // Calc distance on Axis-X to use in scale
       let totalX = Math.abs(lastSelection.x2 - lastSelection.x1);

       // Get current point [x,y] on canvas
       const originalPoint = [zx.invert(lastSelection.x1), zy.invert(lastSelection.y1)];
       // Calc scale mapping distance AxisX in width * k
       // Example: Scale 1, width: 830, totalX: 415
       // Result in a zoom of 2
       const t = d3.zoomIdentity.scale(((width * lastTransform.k) / totalX));
       // Re-scale axis for the new transformation
       zx = t.rescaleX(x);
       zy = t.rescaleY(y);
       // Call zoomFunction with a new transformation from the new scale and brush position.
       // To calculate the brush position we use the originalPoint in the new Axis Scale.
       // originalPoint it's always positive (because we're sure it's within the canvas).
       // We need to translate this originalPoint to [0,0]. So, we do (0 - position) or (position * -1)
       canvas
           .transition()
           .duration(200)
           .ease(d3.easeLinear)
           .call(zoom_function.transform,
               d3.zoomIdentity
                   .translate(zx(originalPoint[0]) * -1, zy(originalPoint[1]) * -1)
                   .scale(t.k));
       lastSelection = null;
   } else {
       brushSvg.call(brush.move, null);
   }
}
