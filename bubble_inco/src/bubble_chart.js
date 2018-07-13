

/* bubbleChart creation function. Returns a function that will
 * instantiate a new bubble chart given a DOM element to display
 * it in and a dataset to visualize.
 *
 * Organization and style inspired by:
 * https://bost.ocks.org/mike/chart/
 *
 */

function bubbleChart() {
  const fullHeight = 600;
  const margin = {top: 0, right: 0, bottom: 100, left: 0};

  // Constants for sizing
  const width = 940;
  const height = 600 - margin.top - margin.bottom;

  // tooltip for mouseover functionality
  var tooltip = floatingTooltip('gates_tooltip', 240);

  // Locations to move bubbles towards, depending
  // on which view mode is selected.
  var center = { x: width / 2, y: height / 2 };

  // calculate with data 
  var yearCenters = {};
  var yearsTitleX = {};

  // data relevant for statistics
  var countStatus = {
    interino: [0,0,0,0,0],
    efectivo: [0,0,0,0,0],
    dt:       [0,0,0,0,0],
  }
  var numberOfPeople = 0;

  // Used when setting up force and
  // moving around nodes
  var damper = 0.102;

  // These will be set in create_nodes and create_vis
  var svg = null;
  var svgYears = null;
  var bubbles = null;
  var nodes = [];

  // Charge function that is called for each node.
  // Charge is proportional to the diameter of the
  // circle (which is stored in the radius attribute
  // of the circle's associated data.
  // This is done to allow for accurate collision
  // detection with nodes of different sizes.
  // Charge is negative because we want nodes to repel.
  // Dividing by 8 scales down the charge to be
  // appropriate for the visualization dimensions.
  function charge(d) {
    return -Math.pow(d.radius, 2.0) / 8;
  }

  // Here we create a force layout and
  // configure it to use the charge function
  // from above. This also sets some contants
  // to specify how the force layout should behave.
  // More configuration is done below.
  var force = d3.layout.force()
    .size([width, height])
    .charge(charge)
    .gravity(-0.01)
    .friction(0.9);


  // Nice looking colors - no reason to buck the trend
  var fillColor = d3.scale.ordinal()
    .domain([1,2,3,4,5])
    //.range(['blue', 'green', 'orange', 'red', 'violet']); '#662D91'
    .range(['#3FA9F5', '#7AC943', '#FF931E', '#FF1D25', 'violet']);

  // Sizes bubbles based on their area instead of raw radius
  var radiusScale = d3.scale.pow()
    .exponent(0.5)
    .range([2, 20]);


  function createLegend(){
    const dataForLegend = [
      { 'status': 'interino'},
      { 'status': 'efectivo'},
      { 'status': 'dt'}]

    const circleRadius = 10;
    
    const legendShiftY = 15;
    const yInterino = legendShiftY + 15;
    const translateY = circleRadius*2 + 4;
    const yEfectivo = yInterino + translateY;
    const yDt = yEfectivo + translateY;

    const g = d3.select('svg')
      .append("g")
      .attr("id","chart-legend")
      .attr("transform", "translate(" + margin.left + "," + height+ ")")
      .selectAll('g')
      .data(dataForLegend)
      .enter()
      .append('g')
      .attr('id', d => d.status);

    // circles of each group
    g.selectAll('circle')
      .data(function(d,i,p){
        return [d.status,d.status,d.status,d.status,d.status]
      })
      .enter()
      .append('circle')
      .attr('class', d => d )
      .attr('fill', function(d,i) {return fillColor(i+1);} )
      .attr('stroke', function (d,i) { return d3.rgb(fillColor(i+1)).darker(); })
      .attr('stroke-width', 2)
      .attr("cx", (d,i) => (100 + i*(circleRadius+40)))
      .attr("cy", function(d) {
        if(d.charAt(0) == 'e')
          return yEfectivo
        else if (d.charAt(0) == 'd')
          return yDt
        else return yInterino;
      })
      .attr("r", function(d,i,p){
        //console.log(d,i,p)
        return circleRadius;
      })


    // text in the circle
    g.selectAll('text.percentage')
      .data(function(d,i,p){
        return [d.status,d.status,d.status,d.status,d.status]
      })
      .enter()
      .append('text')
      .attr('class','percentage')
      .style("text-anchor", "middle")
      .style("alignment-baseline","central")
      .attr("x", (d,i) => (100 + i*(circleRadius+40)))
      .attr("y", function(d) {
        if(d.charAt(0) == 'e')
          return yEfectivo
        else if (d.charAt(0) == 'd')
          return yDt
        else return yInterino;
      })
      .text(function(d,i){
        if(d.charAt(0) == 'e')
          return countStatus.efectivo[i]
        else if (d.charAt(0) == 'd')
          return countStatus.dt[i]
        else return countStatus.interino[i];
        
      })
    // text over circles
    g.selectAll('text')
      .data(function(d,i,p){
        return [1,2,3,4,5]
      })
      .enter()
      .append('text')
      .attr('fill', fillColor )
      //.attr('class', d => 'g'+d)
      .attr("x", (d,i) => (100 + i*(circleRadius+40)))
      .attr("y", legendShiftY)
      .style("text-anchor", "middle")
      .attr("font-size", 16)
      .text(d => 'G'+d)

    // text left to the circles
    g
      .append('g')
      .selectAll('text')
      .data(function(d,i,p){
        return ['interino','efectivo', 'dt']
      })
      .enter()
      .append('text')
      .style("text-anchor", "end")
      .style("alignment-baseline","central")
      .attr("font-size", 16)
      .attr("x", 70)
      .attr("y", function(d) {
        if(d.charAt(0) == 'e')
          return yEfectivo
        else if (d.charAt(0) == 'd')
          return yDt
        else return yInterino;
      })
      .text(d => d)
  }

  /*
   * This data manipulation function takes the raw data from
   * the CSV file and converts it into an array of node objects.
   * Each node will store data and visualization values to visualize
   * a bubble.
   *
   * rawData is expected to be an array of data objects, read in from
   * one of d3's loading functions like d3.csv.
   *
   * This function returns the new node array, with a node in that
   * array for each element in the rawData input.
   */
  function createNodes(rawData) {
    // Use map() to convert raw data into node data.
    // Checkout http://learnjsdata.com/ for more on
    // working with data.
    var myNodes = rawData.map(function (d) {
      const year = d.INGRESO.split("/")[2];
      return {
        id: d.CI,
        radius: radiusScale(+d.HORAS),
        value: d.HORAS,
        name: d.DOCENTE,
        status: d.CARGO,
        group: d.GRADO,
        year: +year,
        startedAt: d.INGRESO,
        dt: d.DT == 1 ? "si" : "no",
        x: Math.random() * width,
        y: Math.random() * height
      };
    });

    // sort them to prevent occlusion of smaller nodes.
    myNodes.sort(function (a, b) { return b.value - a.value; });

    return myNodes;
  }


  function calculateStatistics(nodes){  
    for(var i=0;i< nodes.length;i++){ 
      const node = nodes[i];
      if(node.dt == "no"){
        countStatus[node.status.toLowerCase()][node.group-1] += 1;
      }
      else{
        countStatus['dt'][node.group-1] += 1;
      }
    }

    numberOfPeople = countStatus.interino.reduce((a,b)=>a+b, 0) + countStatus.efectivo.reduce((a,b)=>a+b, 0)  + countStatus.dt.reduce((a,b)=>a+b, 0) 
    console.log(countStatus, numberOfPeople)
  }


  function calculateYearCenters(myNodes){
    const [minYear,maxYear] = d3.extent(myNodes, function (d) { return +d.year; })

    const years = d3.range(minYear,maxYear+1);

    for(var i=0;i< years.length;i++){ 
      yearCenters[years[i]] = { x: 20 + ((width-2*20)/years.length*i), y: height / 2 }
      yearsTitleX[years[i]] = 20 + ((width-2*20)/years.length*i);
    }

    // yearCenters = {
    //   2008: { x: width / 3, y: height / 2 },
    //   2009: { x: width / 2, y: height / 2 },
    //   2010: { x: 2 * width / 3, y: height / 2 }
    // };

    // X locations of the year titles.
    // yearsTitleX = {
    //   2008: 160,
    //   2009: width / 2,
    //   2010: width - 160
    // };
  }

  /*
   * Main entry point to the bubble chart. This function is returned
   * by the parent closure. It prepares the rawData for visualization
   * and adds an svg element to the provided selector and starts the
   * visualization creation process.
   *
   * selector is expected to be a DOM element or CSS selector that
   * points to the parent element of the bubble chart. Inside this
   * element, the code will add the SVG continer for the visualization.
   *
   * rawData is expected to be an array of data objects as provided by
   * a d3 loading function like d3.csv.
   */
  var chart = function chart(selector, rawData) {
    // Use the max total_amount in the data as the max in the scale's domain
    // note we have to ensure the total_amount is a number by converting it
    // with `+`.
    var maxAmount = d3.max(rawData, function (d) { return +d.HORAS; });
    radiusScale.domain([0, maxAmount]);

    nodes = createNodes(rawData);

    // Set the force's nodes to our newly created nodes array.
    force.nodes(nodes);

    // Create a SVG element inside the provided selector
    // with desired size.
    const svgMain = d3.select(selector)
      .append('svg')
      .attr('width', '100%')
      //.attr('height', height);
      .attr('viewBox', '0 0 '+width+' '+fullHeight)

    // for lines and years -- should go in the back
    svgYears = svgMain  
      .append("g")
      .attr("id","years-group")
      .attr("transform", "translate(" + margin.left + "," + margin.top+ ")");


    // for bubbles
    svg = svgMain  
      .append("g")
      .attr("id","chart-group")
      .attr("transform", "translate(" + margin.left + "," + margin.top+ ")");



    calculateYearCenters(nodes);
    calculateStatistics(nodes)
    createLegend();
    // Bind nodes data to what will become DOM elements to represent them.
    bubbles = svg.selectAll('.bubble')
      .data(nodes, function (d) { return d.id; });

    // Create new circle elements each with class `bubble`.
    // There will be one circle.bubble for each object in the nodes array.
    // Initially, their radius (r attribute) will be 0.
    bubbles.enter().append('circle')
      .classed('bubble', true)
      .attr('r', 0)
      .attr('fill', function (d) { 
        return fillColor(+d.group); 
      })
      .attr("class", d => d.status == "INTERINO" ? "interino" : "efectivo")
      //.attr('stroke', function (d) { return d3.rgb(fillColor(+d.group)).darker(); })
      .attr('stroke', function (d) { return d.dt == "si" ? "black" : d3.rgb(fillColor(+d.group)).darker(); })
      .attr('stroke-width', 2)
      .on('mouseover', showDetail)
      .on('mouseout', hideDetail);

    // Fancy transition to make bubbles appear, ending with the
    // correct radius
    bubbles.transition()
      .duration(2000)
      .attr('r', function (d) { return d.radius; });

    // Set initial layout to single group.
    groupBubbles();
  };

  /*
   * Sets visualization in "single group mode".
   * The year labels are hidden and the force layout
   * tick function is set to move all granodes to the
   * center of the visualization.
   */
  function groupBubbles() {
    hideYears();

    force.on('tick', function (e) {
      bubbles.each(moveToCenter(e.alpha))
        .attr('cx', function (d) { return d.x; })
        .attr('cy', function (d) { return d.y; });
    });

    force.start();
  }

  /*
   * Helper function for "single group mode".
   * Returns a function that takes the data for a
   * single node and adjusts the position values
   * of that node to move it toward the center of
   * the visualization.
   *
   * Positioning is adjusted by the force layout's
   * alpha parameter which gets smaller and smaller as
   * the force layout runs. This makes the impact of
   * this moving get reduced as each node gets closer to
   * its destination, and so allows other forces like the
   * node's charge force to also impact final location.
   */
  function moveToCenter(alpha) {
    return function (d) {
      d.x = d.x + (center.x - d.x) * damper * alpha;
      d.y = d.y + (center.y - d.y) * damper * alpha;
    };
  }

  /*
   * Sets visualization in "split by year mode".
   * The year labels are shown and the force layout
   * tick function is set to move nodes to the
   * yearCenter of their data's year.
   */
  function splitBubbles() {
    showYears();
    force.on('tick', function (e) {
      bubbles.each(moveToYears(e.alpha))
        .attr('cx', function (d) { return d.x; })
        .attr('cy', function (d) { return d.y; });
    });
    force.start();
  }

  /*
   * Helper function for "split by year mode".
   * Returns a function that takes the data for a
   * single node and adjusts the position values
   * of that node to move it the year center for that
   * node.
   *
   * Positioning is adjusted by the force layout's
   * alpha parameter which gets smaller and smaller as
   * the force layout runs. This makes the impact of
   * this moving get reduced as each node gets closer to
   * its destination, and so allows other forces like the
   * node's charge force to also impact final location.
   */
  function moveToYears(alpha) {
    return function (d) {
      var target = yearCenters[d.year];
      // d.x = d.x + (center.x - d.x) * damper * alpha;
      d.x = target.x
      d.y = d.y + (target.y - d.y) * damper * alpha * 1.1;
    };
  }

  /*
   * Hides Year title displays.
   */
  function hideYears() {
    svgYears.selectAll('.year').remove();
    svgYears.selectAll('.yearLine').remove();
  }

  /*
   * Shows Year title displays.
   */
  function showYears() {
    // Another way to do this would be to create
    // the year texts once and then just hide them.
    var yearsDataComplete = d3.keys(yearsTitleX);
    var yearsData = yearsDataComplete.filter(checkIndex)
    //console.log("www",yearsData)
    var years = svgYears.selectAll('.year')
      .data(yearsData);

    years.enter().append('text')
      .attr('class', 'year')
      .attr('x', function (d) { return yearsTitleX[d]; })
      .attr('y', 40)
      .attr('text-anchor', 'middle')
      .attr("font-size", "12px")
      .text(function (d) { return d; });

    var yearsLines = svgYears.selectAll('.yearLine')
      .data(yearsDataComplete);

    yearsLines.enter().append('line')
      .attr('class', 'yearLine')
      .attr('x1', function (d) { return yearsTitleX[d]; })
      .attr('y1', 50)
      .attr('x2', function (d) { return yearsTitleX[d]; })
      .attr('y2', height-10)
      .attr('stroke', 'black')
      .attr('opacity', 0.4)
      .style('stroke-dasharray', "3,3")


  }
  function checkIndex(element,i) {
    return i%2 == 0;
  }

  /*
   * Function called on mouseover to display the
   * details of a bubble in the tooltip.
   */
  function showDetail(d) {
    // change outline to indicate hover state.
    d3.select(this).attr('stroke', 'cyan');

    var content = '<span class="name">Nombre: </span><span class="value">' +
                  d.name +
                  '</span><br/>' +
                  '<span class="name">Tipo de cargo: </span><span class="value">' +
                  d.status +
                  '</span><br/>' +
                  '<span class="name">Horas: </span><span class="value">' +
                  d.value +
                  '</span><br/>' +
                  '<span class="name">Fecha de ingreso: </span><span class="value">' +
                  d.startedAt +
                  '</span>';
    tooltip.showTooltip(content, d3.event);
  }

  /*
   * Hides tooltip
   */
  function hideDetail(d) {
    // reset outline
    d3.select(this)
      .attr('stroke',function (d) { return d.dt == "si" ? "black" : d3.rgb(fillColor(+d.group)).darker(); });

    tooltip.hideTooltip();
  }

  /*
   * Externally accessible function (this is attached to the
   * returned chart function). Allows the visualization to toggle
   * between "single group" and "split by year" modes.
   *
   * displayName is expected to be a string and either 'year' or 'all'.
   */
  chart.toggleDisplay = function (displayName) {
    if (displayName === 'year') {
      splitBubbles();
    } else {
      groupBubbles();
    }
  };
  // return the chart function from closure.
  return chart;
} // -------------------------------------------------- end of the bubble chart

/*
 * Below is the initialization code as well as some helper functions
 * to create a new bubble chart instance, load the data, and display it.
 */

var myBubbleChart = bubbleChart();

/*
 * Function called once data is loaded from CSV.
 * Calls bubble chart function to display inside #vis div.
 */
function display(error, data) {
  if (error) {
    console.log(error);
  }

  myBubbleChart('#vis', data);
}

/*
 * Sets up the layout buttons to allow for toggling between view modes.
 */
function setupButtons() {
  d3.select('#toolbar')
    .selectAll('.button')
    .on('click', function () {
      // Remove active class from all buttons
      d3.selectAll('.button').classed('active', false);
      // Find the button just clicked
      var button = d3.select(this);

      // Set it as the active button
      button.classed('active', true);

      // Get the id of the button
      var buttonId = button.attr('id');

      // Toggle the bubble chart based on
      // the currently clicked button.
      myBubbleChart.toggleDisplay(buttonId);
    });
}

// Load the data.
d3.csv('data/datos-inco-junio.csv', display);

// setup the buttons.
setupButtons();
