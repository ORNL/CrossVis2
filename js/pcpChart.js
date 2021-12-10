var pcpChart = function () {
  let margin = {
    top: 20,
    right: 10,
    bottom: 20,
    left: 10,
  };

  let width = 800 - margin.left - margin.right;
  let height = 300 - margin.top - margin.bottom;
  let titleText = "";

  let selectedLineOpacity = 0.15;
  let unselectedLineOpacity = 0.05;
  let selectedLineColor = "steelblue";
  let unselectedLineColor = "#CCC";
  
  let axisBarFill = "#FAFAFA";
  let axisBarStroke = "#9E9E9E";
  let dispersionRectFill = "#B0BEC5";
  let dispersionRectStroke = d3.rgb(axisBarStroke).darker();
  let rangeRectFill = "#E0E0E0";
  let rangeRectStroke = dispersionRectStroke;
  let typicalLineStroke = "#424242";
  let selectionTypicalLineStroke = d3.rgb(typicalLineStroke).darker();
  let selectionRangeStroke = d3.rgb(rangeRectStroke).darker();
  // let rangeLineStroke = dispersionRectStroke;
  let histogramFillColor = "#CCD1D1";
  let histogramStrokeColor = rangeRectStroke;
  let selectedHistogramStrokeColor = d3.rgb(histogramStrokeColor).darker();
  let categoryRectFill = rangeRectFill;
  let categoryRectStroke = rangeRectStroke;
  let highlightFill = "gold";
  let highlightStroke = "#000";
    
  let showSelected = true;
  let showUnselected = true;
  let showAxisTicks = true;
  let showAxisTickLabels = true;
  let showHistograms = false;
  let showSummaryStatistics = true;
  // let categoryHeightMode = "proportional";
  let categoryHeightMode = "equal";
  let categorySortMode = "name"; // = "count"
  let categorySortOrder = "ascending"; // = "descending"
  let axisSpacing = 0;
  let dimVisibleRectSize = 14;
  let dimVisibleRectPadding = 4;

  let tuples;
  let tupleLines;
  let selectedDimension;
  let svg;
  let foreground;
  let background;
  let selected;
  let unselected;
  let dimensions;
  let hiddenDimensions = [];
  let x;
  let y = {};
  let dimensionHeaderSize = 40;
  let canvasMargin = 6;
  let axisBarWidth = 24;
  let pcpHeight;
  let correlationRectPadding = 8;
  let correlationRectSize = 20;
  let correlationLabelHeight = 12;
  let correlationColorScale = d3.scaleSequential(d3.interpolateRdBu).domain([-1, 1]);
  // let correlationColorScale = d3.scaleSequentialSqrt(t => d3.interpolateRdBu((t + 0.5)/2)).domain([-1, 1]);

  let dimensionSelectionChangeHandler = null;
  let correlationClickHandler;

  let chartDiv;
  let backgroundCanvas, foregroundCanvas;
  let lineColorDimension;

  function chart(selection, data) {
    chartDiv = selection;
    tuples = data.tuples.slice();
    dimensions = data.dimensions.slice();
    _drawChart();
  };

  function _resizeChart() {
    if (chartDiv && tuples && dimensions && svg) {
      pcpHeight = height - correlationRectPadding - correlationRectSize - dimensionHeaderSize - dimVisibleRectSize;

      // if axisSpacing is set then calculate width
      const pcpWidth = !isNaN(axisSpacing) && axisSpacing > 0 ? dimensions.length * axisSpacing : width;

      x.range([0, pcpWidth]);

      chartDiv.select("svg")
        .attr("width", x.range()[1] + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

      backgroundCanvas.attr("width", x.range()[1] + canvasMargin * 2)
        .attr("height", pcpHeight + canvasMargin * 2);

      background = backgroundCanvas.node().getContext("2d");
      background.strokeStyle = unselectedLineColor;
      background.globalAlpha = unselectedLineOpacity;
      background.antialias = false;
      background.lineWidth = 1;
      background.translate(canvasMargin + 0.5, canvasMargin + 0.5);
    
      foregroundCanvas.attr("width", x.range()[1] + canvasMargin * 2)
        .attr("height", pcpHeight + canvasMargin * 2);
      foreground = foregroundCanvas.node().getContext("2d");
      foreground.strokeStyle = selectedLineColor;
      foreground.globalAlpha = selectedLineOpacity;
      foreground.antialias = true;
      foreground.lineWidth = 1.5;
      foreground.translate(canvasMargin + 0.5, canvasMargin + 0.5);

      // svg.select(".selection_indicator_label")
      //   .attr("x", x.range()[1] - 2)
      //   .attr("y", pcpHeight + 14 + correlationRectPadding + correlationRectSize + selectionIndicatorHeight / 2);
      // svg.select(".selection_indicator_context_line")
      //   .attr("x2", x.range()[1])
      //   .attr("y1", pcpHeight + correlationRectPadding + correlationRectSize + selectionIndicatorHeight / 2)
      //   .attr("y2", pcpHeight + correlationRectPadding + correlationRectSize + selectionIndicatorHeight / 2);
      // svg.select(".selection_indicator_line")
      //   .attr("y1", pcpHeight + correlationRectPadding + correlationRectSize + selectionIndicatorHeight / 2)
      //   .attr("y2", pcpHeight + correlationRectPadding + correlationRectSize + selectionIndicatorHeight / 2);
      
      const axis = d3.axisLeft();
      svg.selectAll(".dimension").each(function (dim) {
        d3.select(this).attr("transform", function(d) {
          return `translate(${x(d.name)})`;
        });

        const axisNameText = d3.select(this).select(`.dimensionLabel#dim_${dim.id}`);
        axisNameText.text(dim.name);
        // axisNameText.text(`${dim.id}: ${dim.name}`);
        let box = axisNameText.node().getBBox();
        if (box.width + 6 > x.step()) {
          while (box.width + 10 > x.step()) {
            const currentText = axisNameText.text();
            axisNameText.text(currentText.substring(0, currentText.length - 2).trim());
            box = axisNameText.node().getBBox();
          }
          axisNameText.text(axisNameText.text() + "...");
        }
        axisNameText.append("title")
          .text(d => `${d.name}\n(click to select or drag to reposition)`);
        
        if (dim.type === "numerical") {
          y[dim.name].range(dim.inverted ? [0, pcpHeight] : [pcpHeight, 0]);
          d3.select(this).select(".axisRect")
            .attr("height", pcpHeight);
          d3.select(this).select(".dispersionRect")
            .attr("y", dim.inverted ? y[dim.name](dim.stats.q1) : y[dim.name](dim.stats.q3))
            .attr("height", Math.abs(y[dim.name](dim.stats.q1) - y[dim.name](dim.stats.q3)));
          d3.select(this).select(".rangeRect")
            .attr("y", dim.inverted ? y[dim.name](dim.stats.r0) : y[dim.name](dim.stats.r1))
            .attr("height", Math.abs(y[dim.name](dim.stats.r1) - y[dim.name](dim.stats.r0)));

          d3.select(this).select(".typicalLine")
            .attr("y1", y[dim.name](dim.stats.median))
            .attr("y2", y[dim.name](dim.stats.median));

          d3.select(this).select(".axis")
            .call(axis.scale(y[dim.name])
              .ticks(pcpHeight / 24)
              .tickSize(-axisBarWidth))
            // .call(g => g.selectAll(".tick:first-of-type line").remove())
            // .call(g => g.selectAll(".tick:last-of-type line").remove())
            .call(g => g.selectAll(".tick line")
              // .attr("stroke", "#646464")
              .attr("stroke-opacity", 0.4)
              .attr("stroke-dasharray", "2,2")
              .attr("display", showAxisTicks ? null : "none"))
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".axis text")
              .attr("fill", "#646464")
              .attr("display", showAxisTickLabels ? null : "none")
              .style('text-shadow', '0 1px 0 #fff, 1px 0 0 #fff, 0 -1px 0 #fff, -1px 0 0 #fff'));

          d3.select(this).select(".brush")
            .call(y[dim.name].brush.extent([
                [-axisBarWidth/2, 0],
                [axisBarWidth/2, pcpHeight],
              ]));

          if (dim.currentSelection && dim.currentSelection != null) {
            const selectedRange = [Math.min(y[dim.name](dim.currentSelection[0]), y[dim.name](dim.currentSelection[1])), Math.max(y[dim.name](dim.currentSelection[0]), y[dim.name](dim.currentSelection[1]))];
            d3.select(this).select(".brush").call(y[dim.name].brush.move, selectedRange);
          }
        } else if (dim.type === "temporal") {
          y[dim.name].range([pcpHeight, 0]);
          d3.select(this).select(".axisRect")
            .attr("height", pcpHeight);
          d3.select(this).select(".axis")
            .call(axis.scale(y[dim.name])
              .ticks(pcpHeight / 24)
              .tickSize(-axisBarWidth))
            // .call(g => g.selectAll(".tick:first-of-type line").remove())
            // .call(g => g.selectAll(".tick:last-of-type line").remove())
            .call(g => g.selectAll(".tick line")
              // .attr("stroke", "#646464")
              .attr("stroke-opacity", 0.5)
              .attr("stroke-dasharray", "2,2")
              .attr("display", showAxisTicks ? null : "none"))
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".axis text")
              .attr("fill", "#646464")
              .attr("display", showAxisTickLabels ? null : "none")
              .style('text-shadow', '0 1px 0 #fff, 1px 0 0 #fff, 0 -1px 0 #fff, -1px 0 0 #fff'));
        
          d3.select(this).select(".brush")
            .call(y[dim.name].brush.extent([
                [-axisBarWidth/2, 0],
                [axisBarWidth/2, pcpHeight],
              ]));

          if (dim.currentSelection && dim.currentSelection != null) {
            const selectedRange = [y[dim.name](dim.currentSelection[0]), y[dim.name](dim.currentSelection[1])];
            d3.select(this).select(".brush").call(y[dim.name].brush.move, selectedRange);
          }
        } else if (dim.type === "categorical") {
          y[dim.name].range([pcpHeight, 0]);
          // Calculate the height of each category rectangle
          if (categoryHeightMode === "proportional") {
            d3.select(this).selectAll(".category_rect")
              .each(function (cat, i) {
                i === 0 ? cat.y = 0 : cat.y = dim.categories[i-1].y + dim.categories[i-1].height;
                cat.height = (cat.values.length / tuples.length) * pcpHeight;
                cat.center = cat.y + (cat.height / 2);
                d3.select(this)
                  .attr("y", cat.y)
                  .attr("height", cat.height);
              });
          } else {
            const catRectHeight = y[dim.name].bandwidth();
            d3.select(this).selectAll(".category_rect")
              .each(function (cat, i) {
                cat.y = i * catRectHeight;
                cat.height = catRectHeight;
                cat.center = cat.y + (cat.height / 2);
                d3.select(this)
                  .attr("y", cat.y)
                  .attr("height", cat.height);
              });
          }
          
          d3.select(this).select(".axis").select(".categoryAxisLabels").remove();
          d3.select(this).select(".axis").append("g")
            .attr("class", "categoryAxisLabels")
            .selectAll("text")
            .data(dim.categories.filter(c => c.height > 14))
            .join("text")
              .attr("class", "categoryRectLabel")
              .attr('fill', '#000')
              .style('text-shadow', '0 1px 0 #fff, 1px 0 0 #fff, 0 -1px 0 #fff, -1px 0 0 #fff')
              .attr("y", c => c.center)
              .attr("dx", -2)
              .attr("text-anchor", "end")
              .attr("font-size", 10)
              .attr("pointer-events", "none")
              .text(c => c.name);
        }
      });

      computeTupleLines();
      brush();
      drawHistogramBins();
      drawDimensionVisibilityBar();
    }
  };

  function _drawChart() {
    if (chartDiv && tuples && dimensions) {
      chartDiv.selectAll('*').remove();

      const pcpWidth = !isNaN(axisSpacing) && axisSpacing > 0 ? dimensions.length * axisSpacing : width;

      pcpHeight = height - correlationRectPadding - correlationRectSize - dimensionHeaderSize - dimVisibleRectSize;

      x = d3.scalePoint().range([0, pcpWidth]).padding(0.25);
      
      backgroundCanvas = chartDiv.append("canvas")
        .attr("id", "background")
        .attr("width", x.range()[1] + canvasMargin * 2)
        .attr("height", pcpHeight + canvasMargin * 2)
        .style("position", "absolute")
        .style("top", `${margin.top + dimensionHeaderSize - canvasMargin}px`)
        .style("left", `${margin.left - canvasMargin}px`);

      background = backgroundCanvas.node().getContext("2d");
      background.strokeStyle = unselectedLineColor;
      background.globalAlpha = unselectedLineOpacity;
      background.antialias = false;
      background.lineWidth = 1;
      background.translate(canvasMargin + 0.5, canvasMargin + 0.5);

      foregroundCanvas = chartDiv.append("canvas")
        .attr("id", "foreground")
        .attr("width", x.range()[1] + canvasMargin * 2)
        .attr("height", pcpHeight + canvasMargin * 2)
        .style("position", "absolute")
        .style("top", `${margin.top + dimensionHeaderSize - canvasMargin}px`)
        .style("left", `${margin.left - canvasMargin}px`);
      foreground = foregroundCanvas.node().getContext("2d");
      foreground.strokeStyle = selectedLineColor;
      foreground.globalAlpha = selectedLineOpacity;
      foreground.antialias = true;
      foreground.lineWidth = 1.5;
      foreground.translate(canvasMargin + 0.5, canvasMargin + 0.5);

      svg = chartDiv.append("svg")
        .attr("width", x.range()[1] + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("position", "absolute")
        .append("svg:g")
        .attr("transform", `translate(${margin.left},${margin.top + dimensionHeaderSize})`);

      // TODO: remove or make this only draw when titleText is set
      svg.append("text").attr("x", x.range()[1] / 2)
        .attr("y", -30)
        .style("text-anchor", "middle")
        .style("font-weight", "bold")
        .style("font-size", "12")
        .text(titleText);

      let dimensionNames = [];
      dimensions.map((dim, i) => {
        dimensionNames.push(dim.name);
        dim.id = i;
        dim.inverted = dim.inverted ? dim.inverted : false;
        if (dim.type === "numerical") {
          y[dim.name] = d3.scaleLinear()
            .domain(d3.extent(tuples, (d) => d[dim.name]));
            // .nice();
        } else if (dim.type === "categorical") {
          const domain = [...new Set(tuples.map((d) => d[dim.name]))].sort(
            d3.descending
          );
          y[dim.name] = d3.scaleBand()
            .domain(domain)
            .paddingInner(0.0);
        } else if (dim.type === "temporal") {
          y[dim.name] = d3.scaleTime()
            .domain(d3.extent(tuples, (d) => d[dim.name]));
            // .nice();
        }

        if (y[dim.name]) {
          // TODO
          if (dim.inverted) {
            y[dim.name].range([0, pcpHeight]);
          } else {
            y[dim.name].range([pcpHeight, 0]);
          }
        }

        if (dim.type === "categorical") {
          dim.categories = Array.from(d3.group(tuples, (d) => d[dim.name]), ([key,value],i) => ({name: key, id: i, values: value, numSelected: 0}));
          dim.categories.sort((a,b) => d3.descending(a.values.length, b.values.length));
          dim.selectedCategories = new Set();
        } else {
          dim.currentSelection = null;
          let values = tuples.map(d => d[dim.name]);
            // .filter(d => d !== null && !isNaN(d))
            // .sort(d3.ascending);
          dim.bins = d3.bin()
            .domain(y[dim.name].domain())
            .value((d) => d[dim.name])
            .thresholds(y[dim.name].ticks().length * 2)
            (tuples);

          if (dim.type === "numerical") {
            dim.stats = getSummaryStatistics(values)  
          }

          dim.selected = null;
          dim.unselected = null;
        }
      });
      x.domain(dimensionNames);

      // TODO: Move selection indicator graphics drawing into a dedicated function
      // svg.append("text")
      //   .attr("class", "selection_indicator_label")
      //   .attr("x", x.range()[1] - 2)
      //   .attr("y", pcpHeight + 14 + correlationRectPadding + correlationRectSize + selectionIndicatorHeight / 2)
      //   .attr("text-anchor", "end")
      //   .style("font-size", "12")
      //   .style("font-family", "sans-serif")
      //   .text(`0 / ${tuples.length} (0.0%) Tuples Selected`);
// 
      // svg.append("line")
      //   .attr("class", "selection_indicator_context_line")
      //   .attr("x1", 0)
      //   .attr("x2", x.range()[1])
      //   .attr("y1", pcpHeight + correlationRectPadding + correlationRectSize + selectionIndicatorHeight / 2)
      //   .attr("y2", pcpHeight + correlationRectPadding + correlationRectSize + selectionIndicatorHeight / 2)
      //   .style("stroke", unselectedLineColor)
      //   .style("stroke-width", "2")
      //   .style("stroke-linecap", "round");
// 
      // svg.append("line")
      //   .attr("class", "selection_indicator_line")
      //   .attr("x1", 0)
      //   .attr("x2", x.range()[1])
      //   .attr("y1", pcpHeight + correlationRectPadding + correlationRectSize + selectionIndicatorHeight / 2)
      //   .attr("y2", pcpHeight + correlationRectPadding + correlationRectSize + selectionIndicatorHeight / 2)
      //   .style("stroke", selectedLineColor)
      //   .style("stroke-width", "4")
      //   .style("stroke-linecap", "round");

      // Add a group element for each dimension.
      // TODO: remove g variable
      // const g = svg.selectAll(".dimension")
      //   .data(dimensions)
      //   .enter()
      //   .append("g")
      //   .attr("class", "dimension")
      //   .attr("id", d => `dim_${d.id}`)
      //   .attr("transform", function (d) {
      //     return `translate(${x(d.name)})`;
      //   });
      
      calculateDimensionCorrelations();
      drawDimensions();
      drawHistogramBins();
      drawCorrelationGraphics();
      computeTupleLines();
      selectTuples();
      drawLines();
      drawDimensionVisibilityBar();
    }
  }

  const drag = d3.drag()
    .on("drag", function (event, d) {
      const draggingDimensionName = d3.select(this).attr("id");
      d3.select(this).raise().attr("x", event.x);
    })
    .on("end", function (event, d) {
      const draggingDimensionName = d3.select(this).attr("id");
      const dragDimID = +draggingDimensionName.substring(draggingDimensionName.indexOf("_") + 1);

      let srcIdx = dimensions.findIndex(
        // (d) => d.name === draggingDimensionName
        (d) => d.id === dragDimID
      );

      let dstIdx = event.x > 0
        ? Math.floor(event.x / x.step())
        : Math.ceil(event.x / x.step());

      d3.select(this).attr("x", 0);
      if (dstIdx != 0) {
        const moveDimension = dimensions[srcIdx];
        dimensions.splice(srcIdx, 1);
        dimensions.splice(srcIdx + dstIdx, 0, moveDimension);

        tupleLines.forEach((yCoordinates, tuple) => {
          const moveValue = yCoordinates[srcIdx];
          yCoordinates.splice(srcIdx, 1);
          yCoordinates.splice(srcIdx + dstIdx, 0, moveValue);
        });

        const dimensionNames = dimensions.map((d) => d.name);
        x.domain(dimensionNames);
        svg.selectAll(".dimension").each(function (dim) {
          d3.select(this).attr("transform", function (d) {
            return `translate(${x(d.name)})`;
          });
        });

        drawLines();
        drawCorrelationGraphics();
      }
    });

  function drawHistogramBins() {
    svg.selectAll(".histogramBin").remove();
    svg.selectAll(".selectedHistogramBin").remove();
    svg.selectAll(".dimension")
      .append("g")
        .attr("class", "histogramBin")
        .attr('display', showHistograms ? null : 'none')
        .attr("fill", histogramFillColor)
        .attr("stroke", histogramStrokeColor)
        .each(function (dim) {
          if (dim.type !== 'categorical') {
            const histogramScale = d3
              .scaleLinear()
              .range([0, x.step() * x.padding()])
              .domain([0, d3.max(dim.bins, (d) => d.length)]);

            d3.select(this)
              .selectAll("rect")
              .data(dim.bins)
              .join("rect")
                .attr("x", axisBarWidth / 2)
                .attr("width", d => histogramScale(d.length))
                .attr("y", d => dim.inverted ? y[dim.name](d.x0) : y[dim.name](d.x1))
                .attr("height", d => Math.abs(y[dim.name](d.x0) - y[dim.name](d.x1)))
                .append("title")
                  .text((d) => `[${d.x0}, ${d.x1}]\nCount: ${d.length}`);
          }
        });
    
    // make rectangles for selected histogram bin
    svg.selectAll(".dimension")
      .append("g")
        .attr("class", "selectedHistogramBin")
        .attr('display', showHistograms ? null : 'none')
        .attr("fill", selectedLineColor)
        .attr("stroke", selectedHistogramStrokeColor)
        .each(function (dim) {
          if (dim.type !== 'categorical') {
            if (dim.selected && selected.length !== tuples.length && selected.length > 0) {
              const histogramScale = d3
                .scaleLinear()
                .range([0, x.step() * x.padding()])
                .domain([0, d3.max(dim.bins, (d) => d.length)]);

              d3.select(this)
                .selectAll("rect")
                .data(dim.selected.bins)
                .join("rect")
                  .attr("x", axisBarWidth / 2)
                  .attr("width", d => histogramScale(d.length))
                  .attr("y", d => dim.inverted ? y[dim.name](d.x0) : y[dim.name](d.x1))
                  .attr("height", d => Math.abs(y[dim.name](d.x0) - y[dim.name](d.x1)))
                  .attr("pointer-events", "None");
            } else {
              d3.select(this)
                .selectAll("rect")
                .data(dim.bins)
                .join("rect")
                  .attr("x", axisBarWidth / 2)
                  .attr("width", 0)
                  .attr("y", d => dim.inverted ? y[dim.name](d.x0) : y[dim.name](d.x1))
                  .attr("height", d => Math.abs(y[dim.name](d.x0) - y[dim.name](d.x1)))
                  .attr("pointer-events", "None");
                  // .attr("y", d => y[dim.name](d.x1))
                  // .attr("height", d => y[dim.name](d.x0) - y[dim.name](d.x1))
                  // .append("title")
                  //   .text((d) => `[${d.x0}, ${d.x1}]\n Selected Count: 0`);
            }
          }
        });
  }

  function drawDimensionVisibilityBar() {
    // svg.select(".dimVisibleRect").remove();

    // const dsG = svg.append("g")
    //   .attr("class", "dimensionState")
    //   .attr("transform", `translate(0,${pcpHeight + 14 + correlationRectPadding + correlationRectSize + selectionIndicatorHeight / 2})`);

    svg.select(".dimVisible").remove();
    const dimVisG = svg.append("g")
      .attr("class", "dimVisible")
      .attr("stroke", "gray")
      .attr("transform",  `translate(0,${pcpHeight + 14 + correlationRectPadding + correlationRectSize + 4 /* + selectionIndicatorHeight / 2*/})`);

    // dimVisG.append("g")
    //   .attr("fill", selectedLineColor)
    //   .selectAll("rect")
    //   .data(dimensions)
    //     .join("rect")
    //       .attr("x", (dim, i) => i * (dimVisibleRectSize + dimVisibleRectPadding))
    //       .attr("width", dimVisibleRectSize)
    //       .attr("height", dimVisibleRectSize)
    //       .attr("rx", 2)
    //       .attr("ry", 2)
    //       .on("click", (event, d) => {
    //         // hide dimension
    //       })
    //       .append("title")
    //         .text(dim => `${dim.name}\n(click to hide)`);

    let text = dimVisG.append("text")
      .attr("dy", 11)
      .style("text-anchor", "start")
      .attr("fill", "#646464")
      .attr("stroke", "none")
      .style("font-weight", "bold")
      .style("font-family", "sans-serif")
      .style("font-size", 11)
      .text("Hidden Dimensions:");

    dimVisG.append("g")
      .attr("fill", "#EEE")
      // .attr("transform", `translate(${dimensions.length * (dimVisibleRectSize + dimVisibleRectPadding) + (dimVisibleRectPadding * 2)})`)
      .selectAll("rect")
      .data(hiddenDimensions)
        .join("rect")
          .attr("x", (dim, i) => i * (dimVisibleRectSize + dimVisibleRectPadding) + (text.node().getBBox().width + 4))
          .attr("width", dimVisibleRectSize)
          .attr("height", dimVisibleRectSize)
          .attr("rx", 2)
          .attr("ry", 2)
          .on("click", (event, dim) => {
            // show dimension
            hiddenDimensions.splice(hiddenDimensions.findIndex(d => d.id === dim.id), 1);
            dimensions.push(dim);
            
            x.domain(dimensions.map(d => d.name));

            svg.selectAll(".dimension")
              .data(dimensions)
              .join("g")
                .attr("class", "dimension")
                .attr("id", d => `dim_${d.id}`)
                .attr("transform", function(d) {
                  return `translate(${x(d.name)})`;
                });

            drawDimension(dim);
            calculateDimensionCorrelations();
            computeTupleLines();
            drawDimensionVisibilityBar();
            brush();
          })
          .on("mouseover", function (event, d) {
            d3.select(this).style("cursor", "pointer");
          })
          .on("mouseout", function (event, d) {
            d3.select(this).style("cursor", "default");
          })
          .append("title")
            .text(dim => `${dim.name}\n(click to show)`);
    // svg.append("g")
    //     .attr("class", "dimVisibleRect")
    //     .attr("fill", selectedLineColor)
    //     .attr("stroke", "gray")
    //     .attr("transform",  `translate(0,${pcpHeight + 14 + correlationRectPadding + correlationRectSize + selectionIndicatorHeight / 2})`)
    //   .selectAll("rect")
    //     .data(dimensions)
    //     .join("rect")
    //       .attr("x", (dim, i) => i * (dimVisibleRectSize + dimVisibleRectPadding))
    //       .attr("width", dimVisibleRectSize)
    //       .attr("height", dimVisibleRectSize)
    //       .attr("rx", 2)
    //       .attr("ry", 2)
    //       .append("title")
    //         .text(dim => `${dim.name}\n(click to hide)`);

    // dimensions.forEach((dim,i) => {
    //   dsG.append("rect")
    //     .attr("id", `dim_${dim.id}`)
    //     .attr("x", i * (dimRectSize + dimRectPadding))
    //     .attr("y", 0)
    //     .attr("width", dimRectSize)
    //     .attr("height", dimRectSize)
    //     .attr("rx", 2)
    //     .attr("ry", 2)
    //     .attr("fill", selectedLineColor)
    //     .attr("stroke", "gray")
    //     .append("title")
    //       .text(`${dim.name}`);
    // });

    // hiddenDimensions.forEach((dim,i) => {
    //   console.log(dim.name);
    //   dsG.append("rect")
    //     .attr("id", `dim_${dim.id}`)
    //     .attr("x", (dimensions.length + i) * (dimRectSize + dimRectPadding) + (dimRectPadding * 2))
    //     .attr("y", 0)
    //     .attr("width", dimRectSize)
    //     .attr("height", dimRectSize)
    //     .attr("rx", 2)
    //     .attr("ry", 2)
    //     .attr("fill", "#EEE")
    //     .attr("stroke", "gray")
    //     .append("title")
    //       .text(`${dim.name}`);
    // });
  }

  // set dimension visiblity state
  function setDimensionVisible(dim, visible) {
    if (visible) {
      // show dimension
    } else {
      // hide dimension
      d3.select(`#dim_${dim.id}`).remove();
      dimensions.splice(dimensions.findIndex(d => d.id === dim.id), 1);
      hiddenDimensions.push(dim);
    }
  }

  // remove existing correlation graphics and create new ones based
  // current state of the chart
  function drawCorrelationGraphics() {
    svg.select(".correlation").remove();

    const corrG = svg.append("g")
      .attr("class", "correlation")
      .attr("transform", `translate(0,${pcpHeight + correlationRectPadding})`);

    if (selectedDimension && selectedDimension.type !== "categorical") {
      dimensions.forEach((dim) => {
        if (selectedDimension.id !== dim.id) {
          const r = selectedDimension.correlationMap.get(dim.name);
          if (r) {
            const rectG = corrG.append("g")
              .attr("transform", `translate(${x(dim.name)},0)`);

            rectG.append("rect")
              .attr("id", `corrRect_${selectedDimension.id}_${dim.id}`)
              .attr('x', -(correlationRectSize / 2))
              .attr('width', correlationRectSize)
              .attr('height', correlationRectSize)
              .attr('rx', 2)
              .attr('ry', 2)
              .attr('fill', correlationColorScale(r))
              .attr('stroke', 'gray')
              .on("mouseover", function () {
                if (correlationClickHandler) {
                  d3.select(this).style("cursor", "pointer");
                }
              })
              .on("mouseout", function () {
                d3.select(this).style("cursor", "default");
              })
              .on('click', function(event, d) {
                if (correlationClickHandler) {
                  correlationClickHandler(selectedDimension.name, dim.name);
                }  
              })
              .append("title")
                .text(`'${selectedDimension.name}' vs. '${dim.name}'\ncorrelation r = ${r.toFixed(2)}`)
            rectG.append("text")
              .style('text-anchor', 'middle')
              .style('font-size', 10)
              .style('font-family', 'sans-serif')
              .attr('x', 0)
              .attr('y', correlationRectSize + correlationLabelHeight)
              .text(`r = ${r.toFixed(2)}`);
          }
        }
      });
    } else {
      for (let i = 1; i < dimensions.length; i++) {
        if (dimensions[i].correlationMap && dimensions[i].correlationMap.has(dimensions[i-1].name)) {  
          const r = dimensions[i].correlationMap.get(dimensions[i-1].name);
          const rectG = corrG.append("g")
            .attr("transform", `translate(${(x(dimensions[i].name) + x(dimensions[i-1].name)) / 2},0)`);

          rectG.append("rect")
            .attr("id", `corrRect_${dimensions[i-1].id}_${dimensions[i].id}`)
            .attr('x', -(correlationRectSize / 2))
            .attr('width', correlationRectSize)
            .attr('height', correlationRectSize)
            .attr('rx', 2)
            .attr('ry', 2)
            .attr('fill', correlationColorScale(r))
            .attr('stroke', 'gray')
            .on("mouseover", function () {
              if (correlationClickHandler) {
                d3.select(this).style("cursor", "pointer");
              }
            })
            .on("mouseout", function () {
              d3.select(this).style("cursor", "default");
            })
            .on('click', function(event, d) {
              if (correlationClickHandler) {
                correlationClickHandler(dimensions[i-1].name, dimensions[i].name);
              }     
            })
            .append("title")
              .text(`'${dimensions[i-1].name}' vs. '${dimensions[i].name}'\ncorrelation metric = ${r.toFixed(2)}`)
          rectG.append("text")
              .style('text-anchor', 'middle')
              .style('font-size', 10)
              .style('font-family', 'sans-serif')
              .attr('x', 0)
              .attr('y', correlationRectSize + correlationLabelHeight)
              .text(`r = ${r.toFixed(2)}`)
              .attr("pointer-events", "None");
        }
      }
    }
  }

  // function drawDimensions() {
  //   // draw numerical dimensions
  //   svg.selectAll("g")
  //     .data(dimensions.filter(d => d.type === "numerical"))
  //     .join("g")
  //       .attr("class", "dimension")
  //       .attr("id", d => `dim_${d.id}`)
  //       .attr("transform", function (d) {
  //         return `translate(${x(d.name)})`;
  //       })
  //       .call(g => g.append("rect")
  //         .attr("class", "axisRect")
  //         .attr("x", -axisBarWidth / 2)
  //         .attr("width", axisBarWidth)
  //         .attr("height", pcpHeight)
  //         .attr("stroke", "gray")
  //         .attr("fill", "whitesmoke"));
    
  //   svg.selectAll("g")
  //     .data(dimensions.filter(d => d.type === "categorical"))
  //     .join("g")
  //       .attr("class", "dimension")
  //       .attr("id", d => `dim_${d.id}`)
  //       .attr("transform", function (d) {
  //         return `translate(${x(d.name)})`;
  //       })
  //       .call(g => g.append("g")
  //         .attr("fill", "#DDD")
  //         .attr("stroke", "gray")
  //         .attr("stroke-width", .7)
  //         .selectAll("rect")
  //         .data(d => d.categories)
  //         .join("rect")
  //           .attr("class", "category_rect")
  //           .attr("id", cat => `cat_${cat.id}`)
  //           .attr("x", -axisBarWidth / 2)
  //           .attr("y", cat => cat.y)
  //           .attr("rx", 3)
  //           .attr("ry", 3)
  //           .attr("width", axisBarWidth)
  //           .attr("height", cat => cat.height));

    
  // }

  function drawDimension(dim) {
    const dimG = d3.select(`.dimension#dim_${dim.id}`);

    if (dim.type === "numerical") {
      // draw axis bar
      dimG.append("rect")
        .attr("class", "axisRect")
        .attr('x', -axisBarWidth / 2)
        .attr('width', axisBarWidth)
        .attr('height', pcpHeight)
        .attr('stroke', axisBarStroke)
        .attr('fill', axisBarFill);
        // .attr('stroke', 'gray')
        // .attr('fill', 'whitesmoke');

      // overall range rectangle
      dimG.append("rect")
        .attr("class", "rangeRect")
        .attr("x", -axisBarWidth / 2)
        .attr("width", axisBarWidth)
        .attr("y", dim.inverted ? y[dim.name](dim.stats.r0) : y[dim.name](dim.stats.r1))
        .attr("height", Math.abs(y[dim.name](dim.stats.r1) - y[dim.name](dim.stats.r0)))
        .attr("stroke-width", 0.8)
        .attr("stroke", rangeRectStroke)
        .attr('fill', rangeRectFill)
        .attr('display', showSummaryStatistics ? null : "None");

      // overall dispersion rectangle
      dimG.append("rect")
        .attr("class", "dispersionRect")
        .attr("x", -axisBarWidth / 2)
        .attr("width", axisBarWidth)
        .attr("y", dim.inverted ? y[dim.name](dim.stats.q1) : y[dim.name](dim.stats.q3))
        .attr("height", Math.abs(y[dim.name](dim.stats.q1) - y[dim.name](dim.stats.q3)))
        .attr("stroke-width", 0.8)
        .attr("stroke", dispersionRectStroke)
        .attr('fill', dispersionRectFill)
        .attr('display', showSummaryStatistics ? null : "None");

      // draw typical value line
      dimG.append("line")
        .attr("class", "typicalLine")
        .attr("x1", -axisBarWidth / 2)
        .attr("x2", axisBarWidth / 2)
        .attr("y1", y[dim.name](dim.stats.median))
        .attr("y2", y[dim.name](dim.stats.median))
        .attr("stroke", typicalLineStroke)
        .attr("stroke-width", 2)
        .attr('display', showSummaryStatistics ? null : "None");
      
      // selected range line
      dimG.append("line")
        .attr("class", "selectedRangeLine")
        .attr("x1", -(axisBarWidth / 4))
        .attr("x2", -(axisBarWidth / 4))
        .attr("y1", dim.inverted ? y[dim.name](dim.stats.r0) : y[dim.name](dim.stats.r1))
        .attr("y2", dim.inverted ? y[dim.name](dim.stats.r1) : y[dim.name](dim.stats.r0))
        .attr("stroke", selectionRangeStroke)
        .attr("stroke-width", 2)
        .attr("display", "None");

      // selected dispersion rectangle
      dimG.append("rect")
        .attr('id', 'selectedDispersionRect')
        // .attr('x', -(axisBarWidth / 4) - 2)
        .attr("x", -(3*axisBarWidth/8))
        .attr("width", (axisBarWidth / 4))
        // .attr('width', 4)
        .attr("y", dim.inverted ? y[dim.name](dim.stats.q1) : y[dim.name](dim.stats.q3))
        .attr("height", Math.abs(y[dim.name](dim.stats.q1) - y[dim.name](dim.stats.q3)))
        .attr('stroke', selectionRangeStroke)
        .attr('stroke-width', 1)
        .attr('fill', selectedLineColor)
        // .attr('fill-opacity', .6)
        .attr('display', 'None');
      
      // selected typical line
      dimG.append("line")
        .attr('id', 'selectedTypicalLine')
        .attr("x1", -(3*axisBarWidth/8))
        .attr("x2", -(axisBarWidth/8))
        // .attr("x1", -(axisBarWidth / 4) - 2)
        // .attr("x2", -(axisBarWidth / 4) + 2)
        .attr("y1", y[dim.name](dim.stats.median))
        .attr("y2", y[dim.name](dim.stats.median))
        .attr("stroke", selectionTypicalLineStroke)
        .attr("stroke-width", 2)
        .attr('display', 'None');
      
      // unselected range line
      dimG.append("line")
        .attr("class", "unselectedRangeLine")
        .attr("x1", (axisBarWidth / 4))
        .attr("x2", (axisBarWidth / 4))
        .attr("y1", dim.inverted ? y[dim.name](dim.stats.r0) : y[dim.name](dim.stats.r1))
        .attr("y2", dim.inverted ? y[dim.name](dim.stats.r1) : y[dim.name](dim.stats.r0))
        .attr("stroke", selectionRangeStroke)
        .attr("stroke-width", 2)
        .attr("display", "None");

      // unselected dispersion rectangle
      dimG.append("rect")
        .attr('id', 'unselectedDispersionRect')
        .attr("x", (axisBarWidth/8))
        .attr("width", (axisBarWidth / 4))
        // .attr('x', (axisBarWidth / 4) - 2)
        // .attr('width', 4)
        .attr("y", dim.inverted ? y[dim.name](dim.stats.q1) : y[dim.name](dim.stats.q3))
        .attr("height", Math.abs(y[dim.name](dim.stats.q1) - y[dim.name](dim.stats.q3)))
        .attr('stroke', selectionRangeStroke)
        .attr('stroke-width', 1)
        .attr('fill', unselectedLineColor)
        .attr('display', 'None');

      // unselected typical line
      dimG.append("line")
        .attr('id', 'unselectedTypicalLine')
        .attr("x1", (axisBarWidth/8))
        .attr("x2", (3*axisBarWidth/8))
        // .attr("x1", (axisBarWidth / 4) - 2)
        // .attr("x2", (axisBarWidth / 4) + 2)
        .attr("y1", y[dim.name](dim.stats.median))
        .attr("y2", y[dim.name](dim.stats.median))
        .attr("stroke", selectionTypicalLineStroke)
        // .attr("stroke", "#00008B")
        .attr("stroke-width", 2)
        .attr('display', 'None');
    } else if (dim.type === "temporal") {
      dimG.append("rect")
        .attr("class", "axisRect")
        .attr('x', -axisBarWidth / 2)
        .attr('width', axisBarWidth)
        .attr('height', pcpHeight)
        .attr('stroke', axisBarStroke)
        .attr('fill', axisBarFill);
    } else if (dim.type === "categorical") {
      /*
      const grpHeight = y[dim.name].bandwidth();
      dim.categories.map((cat,i) => {
        i === 0 ? cat.y = 0 : cat.y = dim.categories[i-1].y + dim.categories[i-1].height;
        cat.height = (cat.values.length / tuples.length) * pcpHeight;
        cat.center = cat.y + (cat.height / 2);
      });
      */
      // Calculate the heights of each category rectangle
      dim.categories.map((cat, i) => {
        if (categoryHeightMode === "proportional") {
          dim.categories.map((cat,i) => {
            i === 0 ? cat.y = 0 : cat.y = dim.categories[i-1].y + dim.categories[i-1].height;
            cat.height = (cat.values.length / tuples.length) * pcpHeight;
            cat.center = cat.y + (cat.height / 2);
          });
        } else {
          const catRectHeight = y[dim.name].bandwidth();
          dim.categories.map((cat,i) => {
            cat.y = i * catRectHeight;
            cat.height = catRectHeight;
            cat.center = cat.y + (cat.height / 2);
          });
        }
      });
      dimG.append("g")
        .attr("fill", categoryRectFill)
        .attr("stroke", categoryRectStroke)
        // .attr("fill", "#DDD")
        // .attr("stroke", "gray")
        .attr("stroke-width", 1)
        .selectAll("rect")
          .data(dim.categories)
          .join("rect")
            .attr("class", "category_rect")
            .attr("id", cat => `cat_${cat.id}`)
            .attr("x", -axisBarWidth / 2)
            .attr("y", cat => cat.y)
            .attr("rx", 3)
            .attr("ry", 3)
            .attr("width", axisBarWidth)
            .attr("height", cat => cat.height)
            .on("click", function(event, cat) {
              if (dim.selectedCategories.has(cat.id)) {
                dim.selectedCategories.delete(cat.id);
                d3.select(this)
                  .attr("stroke", null)
                  .attr("stroke-width", null)
                  .attr("fill", null)
                  .attr("fill-opacity", null);
              } else {
                dim.selectedCategories.add(cat.id);
                d3.select(this)
                  // .raise()
                  .attr("fill", highlightFill)
                  .attr("fill-opacity", 0.4)
                  .attr("stroke", highlightStroke)
                  .attr("stroke-width", 1.2);
              }
              brush();
              // if (dimensionSelectionChangeHandler) {
              //   dimensionSelectionChangeHandler(dim.name, [...dim.selectedCategories].map(d => dim.categories.find(cat => cat.id === d).name));
              // }
            })
            .on("mouseover", function (event, d) {
              d3.select(this).style("cursor", "pointer");
            })
            .on("mouseout", function (event, d) {
              d3.select(this).style("cursor", "default");
            })
            .append("title")
              .text(c => `${c.name}: ${c.values.length} tuples`);

      // selected category percentages graphics
      dimG.append("g")
        .attr("fill", selectedLineColor)
        .attr("stroke", "none")
        .attr("class", "selectedCategoryRect")
        .attr("display", "none")
        .selectAll("rect")
          .data(dim.categories)
          .join("rect")
            .attr("id", cat => `cat_${cat.id}`)
            .attr("x", (-axisBarWidth / 2) + 4)
            .attr("y", cat => cat.y)
            .attr("rx", 3)
            .attr("ry", 3)
            .attr("width", axisBarWidth - 8)
            .attr("height", cat => cat.height)
            .attr("pointer-events", "none");
    }

    // draw axis name label
    const axisNameText = dimG.append("text")
      .attr("class", "dimensionLabel")
      .attr("id", `dim_${dim.id}`)
      .style("text-anchor", "middle")
      .attr("fill", "#646464")
      .style("font-weight", "bold")
      .style("font-family", "sans-serif")
      .style("font-size", 11)
      .attr("y", -9)
      .text(dim.name)
      // .text(`${dim.id}: ${dim.name}`)
      .call(drag)
      .on('click', function(event, d) {
        if (event.defaultPrevented) return;

        if (selectedDimension === d) {
          d3.select(this)
            .style("fill", '#646464');
          selectedDimension = null;
        } else {
          if (selectedDimension != null) {
            d3.select(`.dimensionLabel#dim_${selectedDimension.id}`)
              .style('fill', '#646464');
          }
          selectedDimension = d;
          d3.select(this)
            .style('fill', '#000')
            .raise();
        }
        drawCorrelationGraphics();
      })
      .on("mouseover", function (event, d) {
        d3.select(this).style("cursor", "pointer");
      })
      .on("mouseout", function (event, d) {
        d3.select(this).style("cursor", "default");
      });
          
    // truncate axis name if too wide
    let box = axisNameText.node().getBBox();
    if (box.width + 6 > x.step()) {
      while (box.width + 10 > x.step()) {
        const currentText = axisNameText.text();
        axisNameText.text(currentText.substring(0, currentText.length - 2).trim());
        box = axisNameText.node().getBBox();
      }
      axisNameText.text(axisNameText.text() + "...");
    }

    // add title to axis name label
    axisNameText.append("title")
      .text(d => `${d.name}\n(click to select or drag to reposition)`);

    // draw invert axis button
    if (dim.type === "numerical") {
      const invertButton = dimG.append("g")
        .attr("transform", `translate(-10, -38)`);
      invertButton.append("path")
        .attr("fill", "#BBB")
        .attr("stroke", "none")
        .attr("d", dim.inverted ? 'M0,12 l-8,-12 h16 z' : 'M0,0 l8,12 h-16 z')
        .on('click', function(event, d) {
          dim.inverted = !dim.inverted;
          d3.select(this)
            .attr("d", dim.inverted ? 'M0,12 l-8,-12 h16 z' : 'M0,0 l8,12 h-16 z');

          if (dim.type === 'numerical') {
            const prevRange = y[dim.name].range();
            y[dim.name].range([prevRange[1], prevRange[0]]);

            const dimG = d3.select(`.dimension#dim_${dim.id}`);
            dimG.select(".dispersionRect")
              .attr("y", dim.inverted ? y[dim.name](dim.stats.q1) : y[dim.name](dim.stats.q3))
              .attr("height", Math.abs(y[dim.name](dim.stats.q1) - y[dim.name](dim.stats.q3)));
            dimG.select(".typicalLine")
              .attr("y1", y[dim.name](dim.stats.median))
              .attr("y2", y[dim.name](dim.stats.median));
            dimG.select(".rangeRect")
              .attr("y", dim.inverted ? y[dim.name](dim.stats.r0) : y[dim.name](dim.stats.r1))
              .attr("height", Math.abs(y[dim.name](dim.stats.r1) - y[dim.name](dim.stats.r0)));
            // dimG.select(".rangeLine")
            //   .attr("y1", dim.inverted ? y[dim.name](dim.stats.r0) : y[dim.name](dim.stats.r1))
            //   .attr("y2", dim.inverted ? y[dim.name](dim.stats.r1) : y[dim.name](dim.stats.r0));

            const axis = d3.axisLeft();
            dimG.select(".axis")
              .call(axis.scale(y[dim.name])
                .ticks(pcpHeight / 24)
                .tickSize(-axisBarWidth))
              .call(g => g.selectAll(".tick line")
                .attr("stroke-opacity", 0.5)
                .attr("stroke-dasharray", "2,2")
                .attr("display", showAxisTicks ? null : "none"))
              .call(g => g.select(".domain").remove())
              .call(g => g.selectAll(".axis text")
                .attr("fill", "#646464")
                .attr("display", showAxisTickLabels ? null : "none")
                .style('text-shadow', '0 1px 0 #fff, 1px 0 0 #fff, 0 -1px 0 #fff, -1px 0 0 #fff'));
            
            if (dim.currentSelection && dim.currentSelection != null) {
              const selectedRange = [Math.min(y[dim.name](dim.currentSelection[0]), y[dim.name](dim.currentSelection[1])), Math.max(y[dim.name](dim.currentSelection[0]), y[dim.name](dim.currentSelection[1]))];
              dimG.select(".brush").call(y[dim.name].brush.move, selectedRange);
            }

            computeTupleLines();
            brush();
            drawHistogramBins();
          }
        })
        .on('mouseover', function(event, d) {
          d3.select(this).style('cursor', 'pointer');
        })
        .on('mouseout', function(event, d) {
          d3.select(this).style('cursor', 'default');
        })
        .append("title")
          .text(d => `Click to invert "${d.name}"`);
    }

    // draw remove axis button
    // Close button
    const removeAxisButton = dimG.append("g")
      .attr("transform", `translate(${dim.type === "numerical" ? 10 : 0},-8)`);
    removeAxisButton.append("rect")
      .attr("x", -7)
      .attr("y", -30)
      .attr('rx', 2)
      .attr('ry', 2)
      .attr("width", 14)
      .attr("height", 10)
      .attr("fill", "#FFF")
      .attr("stroke", "none")
      .on('click', function(event, d) {
        d3.select(`#dim_${dim.id}`).remove();

        // remove dimension from dimensions array
        const removedDim = dimensions.splice(dimensions.findIndex(dd => dd.id === d.id), 1)[0];
        if (removedDim.type === "categorical") {
          removedDim.selectedCategories.clear();
        }
        // add removed dimension to hidden dimensions array
        hiddenDimensions.push(removedDim);

        const dimensionNames = dimensions.map((d) => d.name);
        x.domain(dimensionNames);
        svg.selectAll(".dimension").each(function (dim) {
          d3.select(this).attr("transform", function (d) {
            return `translate(${x(d.name)})`;
          });

          const axisNameText = d3.select(this).select(`.dimensionLabel#dim_${dim.id}`);
          axisNameText.text(dim.name);
          let box = axisNameText.node().getBBox();
          if (box.width + 6 > x.step()) {
            while (box.width + 10 > x.step()) {
              const currentText = axisNameText.text();
              axisNameText.text(currentText.substring(0, currentText.length - 2).trim());
              box = axisNameText.node().getBBox();
            }
            axisNameText.text(axisNameText.text() + "...");
          }
          axisNameText.append("title")
            .text(d => `${d.name}\n(click to select or drag to reposition)`);
        });
        calculateDimensionCorrelations();
        computeTupleLines();
        drawDimensionVisibilityBar();
        brush();
      })
      .on('mouseover', function(event, d) {
        d3.select(this).style('cursor', 'pointer');
      })
      .on('mouseout', function(event, d) {
        d3.select(this).style('cursor', 'default');
      })
      .append("title")
        .text(d => `Click to hide "${d.name}"`);

    removeAxisButton.append("line")
      .attr("x1", -4)
      .attr("y1", -29)
      .attr("x2", 4)
      .attr("y2", -21)
      .attr("stroke", "#BBB")
      .attr("stroke-width", 2)
      .attr("pointer-events", "none");
    removeAxisButton.append("line")
      .attr("x1", -4)
      .attr("y1", -21)
      .attr("x2", 4)
      .attr("y2", -29)
      .attr("stroke", "#BBB")
      .attr("stroke-width", 2)
      .attr("pointer-events", "none");

    // add axis
    if (dim.type === "numerical" || dim.type === "temporal") {
      dimG.append("g")
          .attr("class", "axis")
          .attr("transform", `translate(${-axisBarWidth/2},0)`)
        .call(d3.axisLeft()
          .scale(y[dim.name])
          .ticks(pcpHeight/ 24)
          .tickSize(-axisBarWidth))
        .call(g => g.selectAll(".tick line")
          .attr("stroke-opacity", 0.5)
          .attr("stroke-dasharray", "2,2")
          .attr("display", showAxisTicks ? null : "none"))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".axis text")
          .attr("fill", "#646464")
          .attr("display", showAxisTickLabels ? null : "none")
          .style('text-shadow', '0 1px 0 #fff, 1px 0 0 #fff, 0 -1px 0 #fff, -1px 0 0 #fff'));
    } else if (dim.type === "categorical") {
      dimG.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(${-axisBarWidth/2},0)`)
        .append("g")
          .attr("class", "categoryAxisLabels")
          .selectAll("text")
          .data(dim.categories.filter(c => c.height > 14))
          .join("text")
            .attr("class", "categoryRectLabel")
            .attr('fill', '#000')
            .style('text-shadow', '0 1px 0 #fff, 1px 0 0 #fff, 0 -1px 0 #fff, -1px 0 0 #fff')
            .attr("y", c => c.center)
            .attr("dx", -2)
            .attr("text-anchor", "end")
            .attr("font-size", 10)
            .attr("pointer-events", "none")
            .text(c => c.name);
    }

    // add and store a brush for non-categorical axis
    if (dim.type !== "categorical") {
      dimG.append("g")
        .attr("class", "brush")
        .call((y[dim.name].brush = d3
            .brushY()
            .extent([
              [-axisBarWidth/2, 0],
              [axisBarWidth/2, pcpHeight],
            ])
            // .on("brush", brush)
            .on("end", brush))
        );
      dimG.selectAll(".brush rect.selection")
        .attr("stroke", highlightStroke)
        .attr("fill", highlightFill)
        .attr('fill-opacity', .3);
    }
  }

  function drawDimensions() {
    const g = svg.selectAll("g")
      .data(dimensions)
      .join("g")
        .attr("class", "dimension")
        .attr("id", d => `dim_${d.id}`)
        .attr("transform", function (d) {
          return `translate(${x(d.name)})`;
        });

    g.each(function(dim) {
      drawDimension(dim);
    });
  }

  function drawDimensionsOld() {
    // const g = svg.selectAll(".dimension");

    const g = svg.selectAll("g")
      .data(dimensions)
      .join("g")
        .attr("class", "dimension")
        .attr("id", d => `dim_${d.id}`)
        .attr("transform", function (d) {
          return `translate(${x(d.name)})`;
        });

    g.append("g")
      .attr("class", "dimension_stats")
      .each(function(dim) {
        if (dim.type === "numerical") {
          // overall statistical summary (box plot)
          d3.select(this)
            .append("rect")
              .attr("class", "axisRect")
              .attr('x', -axisBarWidth / 2)
              .attr('width', axisBarWidth)
              .attr('height', pcpHeight)
              // .attr('rx', 3)
              // .attr('ry', 3)
              .attr('stroke', 'gray')
              .attr('fill', 'whitesmoke');
          d3.select(this)
            .append("rect")
              .attr("class", "dispersionRect")
              .attr("x", -axisBarWidth / 2)
              .attr("width", axisBarWidth)
              .attr("y", dim.inverted ? y[dim.name](dim.stats.q1) : y[dim.name](dim.stats.q3))
              .attr("height", Math.abs(y[dim.name](dim.stats.q1) - y[dim.name](dim.stats.q3)))
              // .attr("y", y[dim.name](dim.stats.q3))
              // .attr("height", y[dim.name](dim.stats.q1) - y[dim.name](dim.stats.q3))
              .attr("stroke", "gray")
              .attr("stroke-width", 1)
              .attr('fill', 'lightgray');
          d3.select(this)
            .append("line")
              .attr("class", "typicalLine")
              .attr("x1", -axisBarWidth / 2)
              .attr("x2", axisBarWidth / 2)
              .attr("y1", y[dim.name](dim.stats.median))
              .attr("y2", y[dim.name](dim.stats.median))
              .attr("stroke", "#00008B")
              .attr("stroke-width", 2);
          
          // selected dispersion rectangle
          d3.select(this)
            .append("rect")
              .attr('id', 'selectedDispersionRect')
              .attr('x', -(axisBarWidth / 4) - 2)
              .attr('width', 4)
              .attr("y", dim.inverted ? y[dim.name](dim.stats.q1) : y[dim.name](dim.stats.q3))
              .attr("height", Math.abs(y[dim.name](dim.stats.q1) - y[dim.name](dim.stats.q3)))
              // .attr("y", y[dim.name](dim.stats.q3))
              // .attr("height", y[dim.name](dim.stats.q1) - y[dim.name](dim.stats.q3))
              .attr('stroke', 'gray')
              .attr('stroke-width', 1)
              .attr('fill', selectedLineColor)
              .attr('fill-opacity', .6)
              .attr('display', 'None');
          d3.select(this)
            .append("line")
              .attr('id', 'selectedTypicalLine')
              .attr("x1", -(axisBarWidth / 4) - 2)
              .attr("x2", -(axisBarWidth / 4) + 2)
              .attr("y1", y[dim.name](dim.stats.median))
              .attr("y2", y[dim.name](dim.stats.median))
              .attr("stroke", "#00008B")
              .attr("stroke-width", 2)
              .attr('display', 'None');

          // unselected dispersion rectangle
          d3.select(this)
            .append("rect")
              .attr('id', 'unselectedDispersionRect')
              .attr('x', (axisBarWidth / 4) - 2)
              .attr('width', 4)
              .attr("y", dim.inverted ? y[dim.name](dim.stats.q1) : y[dim.name](dim.stats.q3))
              .attr("height", Math.abs(y[dim.name](dim.stats.q1) - y[dim.name](dim.stats.q3)))
              // .attr("y", y[dim.name](dim.stats.q3))
              // .attr("height", y[dim.name](dim.stats.q1) - y[dim.name](dim.stats.q3))
              .attr('stroke', 'gray')
              .attr('stroke-width', 1)
              .attr('fill', unselectedLineColor)
              .attr('fill-opacity', .6)
              .attr('display', 'None');
          d3.select(this)
            .append("line")
              .attr('id', 'unselectedTypicalLine')
              .attr("x1", (axisBarWidth / 4) - 2)
              .attr("x2", (axisBarWidth / 4) + 2)
              .attr("y1", y[dim.name](dim.stats.median))
              .attr("y2", y[dim.name](dim.stats.median))
              .attr("stroke", "#00008B")
              .attr("stroke-width", 2)
              .attr('display', 'None');
        } else if (dim.type === "temporal") {
          d3.select(this)
            .append("rect")
              .attr("class", "axisRect")
              .attr('x', -axisBarWidth / 2)
              .attr('width', axisBarWidth)
              .attr('height', pcpHeight)
              // .attr('rx', 3)
              // .attr('ry', 3)
              .attr('stroke', 'gray')
              .attr('fill', 'whitesmoke');
        } else if (dim.type === "categorical") {
          let grpHeight = y[dim.name].bandwidth();
          dim.categories.map((cat,i) => {
            i === 0 ? cat.y = 0 : cat.y = dim.categories[i-1].y + dim.categories[i-1].height;
            cat.height = (cat.values.length / tuples.length) * pcpHeight;
            cat.center = cat.y + (cat.height / 2);
          });

          d3.select(this).append("g")
            .attr("fill", "#DDD")
            .attr("stroke", "gray")
            .attr("stroke-width", .7)
            .selectAll("rect")
              .data(dim.categories)
              .join("rect")
                .attr("class", "category_rect")
                .attr("id", cat => `cat_${cat.id}`)
                .attr("x", -axisBarWidth / 2)
                .attr("y", cat => cat.y)
                .attr("rx", 3)
                .attr("ry", 3)
                .attr("width", axisBarWidth)
                .attr("height", cat => cat.height)
                .on("click", function(event, cat) {
                  if (dim.selectedCategories.has(cat.id)) {
                    dim.selectedCategories.delete(cat.id);
                    d3.select(this)
                      .attr("stroke", null)
                      .attr("stroke-width", null)
                      .attr("fill", null)
                      .attr("fill-opacity", null);
                  } else {
                    dim.selectedCategories.add(cat.id);
                    d3.select(this)
                      // .raise()
                      .attr("fill", highlightFill)
                      .attr("fill-opacity", 0.4)
                      .attr("stroke", '#000')
                      .attr("stroke-width", 1.2);
                  }
                  brush();
                  // if (dimensionSelectionChangeHandler) {
                  //   dimensionSelectionChangeHandler(dim.name, [...dim.selectedCategories].map(d => dim.categories.find(cat => cat.id === d).name));
                  // }
                })
                .on("mouseover", function (event, d) {
                  d3.select(this).style("cursor", "pointer");
                })
                .on("mouseout", function (event, d) {
                  d3.select(this).style("cursor", "default");
                })
                .append("title")
                  .text(c => `${c.name}: ${c.values.length} tuples`);

          // selected category percentages graphics
          d3.select(this).append("g")
            .attr("fill", selectedLineColor)
            .attr("stroke", "none")
            // .attr("stroke-width", .7)
            .attr("class", "selectedCategoryRect")
            .attr("display", "none")
            .selectAll("rect")
              .data(dim.categories)
              .join("rect")
                // .attr("class", "selectedCategoryRect")
                .attr("id", cat => `cat_${cat.id}`)
                .attr("x", (-axisBarWidth / 2) + 4)
                .attr("y", cat => cat.y)
                .attr("rx", 3)
                .attr("ry", 3)
                .attr("width", axisBarWidth - 8)
                .attr("height", cat => cat.height)
                .attr("pointer-events", "none");
        }
      });

    // Add dimension label and close button
    g.append("g")
      .each(function(dim) {
        const axisNameText = d3.select(this)
          .append("text")
            .attr("class", "dimensionLabel")
            // .attr("id", d => `${d.name}`)
            .attr("id", d => `dim_${d.id}`)
            .style("text-anchor", "middle")
            .attr("fill", "#646464")
            .style("font-weight", "bold")
            .style("font-family", "sans-serif")
            .style("font-size", 11)
            .attr("y", -9)
            .text((d) => d.name)
            .call(drag)
            .on('click', function(event, d) {
              if (event.defaultPrevented) return;
    
              if (selectedDimension === d) {
                d3.select(this)
                  .style("fill", '#646464');
                  // .style('font-size', 10);
                selectedDimension = null;
              } else {
                if (selectedDimension != null) {
                  // d3.select(`#${selectedDimension.name}`)
                  d3.select(`.dimensionLabel#dim_${selectedDimension.id}`)
                    .style('fill', '#646464');
                    // .style('font-size', 10);
                }
                selectedDimension = d;
                d3.select(this)
                  .style('fill', '#000')
                  // .style('font-size', 12)
                  .raise();
              }
              // updateCorrelationGraphics();
              drawCorrelationGraphics();
            })
            .on("mouseover", function (event, d) {
              d3.select(this).style("cursor", "pointer");
            })
            .on("mouseout", function (event, d) {
              d3.select(this).style("cursor", "default");
            });
               
        let box = axisNameText.node().getBBox();
        if (box.width + 6 > x.step()) {
          while (box.width + 10 > x.step()) {
            const currentText = axisNameText.text();
            axisNameText.text(currentText.substring(0, currentText.length - 2).trim());
            box = axisNameText.node().getBBox();
          }
          axisNameText.text(axisNameText.text() + "...");
        }
        
        axisNameText.append("title")
          .text(d => `${d.name}\n(click to select or drag to reposition)`);

        // Invert button
        if (dim.type === "numerical") {
          const invertButton = d3.select(this).append("g")
            .attr("transform", `translate(-10, -38)`);
          invertButton.append("path")
            .attr("fill", "#646464")
            .attr("stroke", "none")
            .attr("d", dim.inverted ? 'M0,12 l-8,-12 h16 z' : 'M0,0 l8,12 h-16 z')
            .on('click', function(event, d) {
              dim.inverted = !dim.inverted;
              d3.select(this)
                .attr("d", dim.inverted ? 'M0,12 l-8,-12 h16 z' : 'M0,0 l8,12 h-16 z');

              if (dim.type === 'numerical') {
                const prevRange = y[dim.name].range();
                y[dim.name].range([prevRange[1], prevRange[0]]);

                const dimG = d3.select(`.dimension#dim_${dim.id}`);
                dimG.select(".dispersionRect")
                  .attr("y", dim.inverted ? y[dim.name](dim.stats.q1) : y[dim.name](dim.stats.q3))
                  .attr("height", Math.abs(y[dim.name](dim.stats.q1) - y[dim.name](dim.stats.q3)));
                dimG.select(".typicalLine")
                  .attr("y1", y[dim.name](dim.stats.median))
                  .attr("y2", y[dim.name](dim.stats.median));

                const axis = d3.axisLeft();
                dimG.select(".axis")
                  .call(axis.scale(y[dim.name])
                    .ticks(pcpHeight / 24)
                    .tickSize(-axisBarWidth))
                  .call(g => g.selectAll(".tick line")
                    .attr("stroke-opacity", 0.5)
                    .attr("stroke-dasharray", "2,2")
                    .attr("display", showAxisTicks ? null : "none"))
                  .call(g => g.select(".domain").remove())
                  .call(g => g.selectAll(".axis text")
                    .attr("fill", "#646464")
                    .attr("display", showAxisTickLabels ? null : "none")
                    .style('text-shadow', '0 1px 0 #fff, 1px 0 0 #fff, 0 -1px 0 #fff, -1px 0 0 #fff'));
                
                if (dim.currentSelection && dim.currentSelection != null) {
                  const selectedRange = [Math.min(y[dim.name](dim.currentSelection[0]), y[dim.name](dim.currentSelection[1])), Math.max(y[dim.name](dim.currentSelection[0]), y[dim.name](dim.currentSelection[1]))];
                  dimG.select(".brush").call(y[dim.name].brush.move, selectedRange);
                }

                computeTupleLines();
                brush();
                drawHistogramBins();
              }
            })
            .on('mouseover', function(event, d) {
              d3.select(this).style('cursor', 'pointer');
            })
            .on('mouseout', function(event, d) {
              d3.select(this).style('cursor', 'default');
            })
            .append("title")
              .text(d => `Click to invert "${d.name}"`);
          }
        
        // Close button
        const removeAxisButton = d3.select(this).append("g")
          .attr("transform", `translate(10,-8)`);
        removeAxisButton.append("rect")
            .attr("x", -7)
            .attr("y", -30)
            .attr('rx', 2)
            .attr('ry', 2)
            .attr("width", 14)
            .attr("height", 10)
            .attr("fill", "ghostwhite")
            .attr("stroke", "none")
            .on('click', function(event, d) {
              d3.select(`#dim_${dim.id}`).remove();

              // remove dimension from dimensions array
              const removedDim = dimensions.splice(dimensions.findIndex(dd => dd.id === d.id), 1);
              // add removed dimension to hidden dimensions array
              hiddenDimensions.push(removedDim[0]);

              const dimensionNames = dimensions.map((d) => d.name);
              x.domain(dimensionNames);
              svg.selectAll(".dimension").each(function (dim) {
                d3.select(this).attr("transform", function (d) {
                  return `translate(${x(d.name)})`;
                });

                const axisNameText = d3.select(this).select(`.dimensionLabel#dim_${dim.id}`);
                axisNameText.text(dim.name);
                let box = axisNameText.node().getBBox();
                if (box.width + 6 > x.step()) {
                  while (box.width + 10 > x.step()) {
                    const currentText = axisNameText.text();
                    axisNameText.text(currentText.substring(0, currentText.length - 2).trim());
                    box = axisNameText.node().getBBox();
                  }
                  axisNameText.text(axisNameText.text() + "...");
                }
                axisNameText.append("title")
                  .text(d => `${d.name}\n(click to select or drag to reposition)`);
              });
              calculateDimensionCorrelations();
              computeTupleLines();
              drawDimensionVisibilityBar();
              brush();
            })
            .on('mouseover', function(event, d) {
              d3.select(this).style('cursor', 'pointer');
            })
            .on('mouseout', function(event, d) {
              d3.select(this).style('cursor', 'default');
            })
            .append("title")
              .text(d => `Click to hide "${d.name}"`);
        removeAxisButton
          .append("line")
            .attr("x1", -4)
            .attr("y1", -29)
            .attr("x2", 4)
            .attr("y2", -21)
            .attr("stroke", "#646464")
            .attr("stroke-width", 2)
            .attr("pointer-events", "none");
        removeAxisButton
          .append("line")
            .attr("x1", -4)
            .attr("y1", -21)
            .attr("x2", 4)
            .attr("y2", -29)
            .attr("stroke", "#646464")
            .attr("stroke-width", 2)
            .attr("pointer-events", "none");
      });

    // Add an axis.
    const axis = d3.axisLeft();
    g.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${-axisBarWidth/2},0)`)
      .each(function (dim) {
        if (dim.type === "numerical" || dim.type === "temporal") {
          d3.select(this)
            .call(axis.scale(y[dim.name])
              .ticks(pcpHeight / 24)
              .tickSize(-axisBarWidth))
            // .call(g => g.selectAll(".tick:first-of-type line").remove())
            // .call(g => g.selectAll(".tick:last-of-type line").remove())
            .call(g => g.selectAll(".tick line")
              // .attr("stroke", "#646464")
              .attr("stroke-opacity", 0.5)
              .attr("stroke-dasharray", "2,2")
              .attr("display", showAxisTicks ? null : "none"))
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".axis text")
              .attr("fill", "#646464")
              .attr("display", showAxisTickLabels ? null : "none")
              .style('text-shadow', '0 1px 0 #fff, 1px 0 0 #fff, 0 -1px 0 #fff, -1px 0 0 #fff'));
        } else if (dim.type === 'categorical') {
          d3.select(this).append("g")
            .attr("class", "categoryAxisLabels")
            .selectAll("text")
            .data(dim.categories.filter(c => c.height > 14))
            // .data(dim.categories)
            .join("text")
              .attr("class", "categoryRectLabel")
              .attr('fill', '#000')
              .style('text-shadow', '0 1px 0 #fff, 1px 0 0 #fff, 0 -1px 0 #fff, -1px 0 0 #fff')
              .attr("y", c => c.center)
              .attr("dx", -2)
              .attr("text-anchor", "end")
              .attr("font-size", 10)
              .attr("pointer-events", "none")
              .text(c => c.name);
        }
      });
  
    // Add and store a brush for each axis.
    g.append("g")
      .attr("class", "brush")
      .each(function (dim) {
        if (dim.type !== 'categorical') {
          d3.select(this).call(
            (y[dim.name].brush = d3
              .brushY()
              .extent([
                [-axisBarWidth/2, 0],
                [axisBarWidth/2, pcpHeight],
              ])
              // .on("brush", brush)
              .on("end", brush))
          );
        }
      })
      .selectAll("rect")
        .attr("x", -8)
        .attr("width", 16);
    
    g.selectAll(".brush rect.selection")
      .attr("stroke", "#000")
      .attr("fill", highlightFill)
      .attr('fill-opacity', .3);
  }

  // Handles a brush event, toggling the display of foreground lines.
  function brush() {
    let actives = [];
    svg.selectAll(".brush")
      .filter(function (dim) {
        y[dim.name].brushSelectionValue = d3.brushSelection(this);
        dim.currentSelection = null;
        return d3.brushSelection(this);
      })
      .each(function (dim) {
        // Get extents of brush along each active selection axis (the Y axes)
        // actives.push({
        //     dimension: dim,
        //     extent: d3.brushSelection(this).map(y[dim.name].invert)
        // });
        if (dim.type === "categorical") {
          let selected = dim.categories.filter(cat => {
            return (
              (cat.y <= d3.brushSelection(this)[0] &&
              cat.y + cat.height > d3.brushSelection(this)[0]) ||
              (cat.y <= d3.brushSelection(this)[1] &&
              cat.y + cat.height > d3.brushSelection(this)[1])
            );
          });
          // let selected = y[dim.name].domain().filter((value) => {
          //   const pos = y[dim.name](value) + y[dim.name].bandwidth() / 2;
          //   return (
          //     pos > d3.brushSelection(this)[0] &&
          //     pos < d3.brushSelection(this)[1]
          //   );
          // });
          actives.push({
            dimension: dim,
            extent: selected.map(d => d.id),
          });
        } else {
          actives.push({
            dimension: dim,
            extent: d3.brushSelection(this).map(y[dim.name].invert),
          });
        }
        dim.currentSelection = actives[actives.length - 1].extent;
      });
    
    dimensions.forEach(dim => {
      if (dim.type === 'categorical') {
        if (dim.selectedCategories.size > 0) {
          actives.push({
            dimension: dim,
            extent: [...dim.selectedCategories].map(d => dim.categories.find(cat => cat.id === d).name)
            // extent: [...dim.selectedCategories]
          });
        }
      }
    })

    selectTuples(actives);
    if (dimensionSelectionChangeHandler) {
      dimensionSelectionChangeHandler(actives);
    }
    drawLines();
  };

  function updateSelectionGraphics() {
    const pctSelected = ((selected.length / tuples.length) * 100).toFixed(1);
    svg.select(".selection_indicator_label")
      .text(`${selected.length} / ${tuples.length} (${pctSelected}%) Lines Selected`);
    const selectionLineWidth = x.range()[1] * (selected.length / tuples.length);
    svg.select(".selection_indicator_line")
      .transition()
      .duration(200)
      .delay(100)
      .attr("x2", selectionLineWidth);
    
    svg.selectAll('.dimension')
      .each(function(dim) {
        if (dim.type !== 'categorical') {
          if (selected.length !== tuples.length && selected.length > 0) {
            if (dim.type === "numerical") {
              // update selected stats graphics
              if (dim.selected) {
                d3.select(this).select('#selectedDispersionRect')
                  .transition()
                    .duration(200)
                  .attr('y', dim.inverted ? y[dim.name](dim.selected.stats.q1) : y[dim.name](dim.selected.stats.q3))
                  .attr('height', Math.abs(y[dim.name](dim.selected.stats.q1) - y[dim.name](dim.selected.stats.q3)))
                  .attr('display', showSummaryStatistics ? null : "None");
                d3.select(this).select(".selectedRangeLine")
                  .attr("y1", dim.inverted ? y[dim.name](dim.selected.stats.r0) : y[dim.name](dim.selected.stats.r1))
                  .attr("y2", dim.inverted ? y[dim.name](dim.selected.stats.r1) : y[dim.name](dim.selected.stats.r0))
                  .attr("display", showSummaryStatistics ? null : "None");
                d3.select(this).select('#selectedTypicalLine')
                  .transition()
                    .duration(200)
                  .attr("y1", y[dim.name](dim.selected.stats.median))
                  .attr("y2", y[dim.name](dim.selected.stats.median))
                  .attr('display', showSummaryStatistics ? null : "None");
                d3.select(this).select('#unselectedDispersionRect')
                  .transition()
                    .duration(200)
                  .attr('y', dim.inverted ? y[dim.name](dim.unselected.stats.q1) : y[dim.name](dim.unselected.stats.q3))
                  .attr('height', Math.abs(y[dim.name](dim.unselected.stats.q1) - y[dim.name](dim.unselected.stats.q3)))
                  .attr('display', showSummaryStatistics ? null : "None");
                d3.select(this).select(".unselectedRangeLine")
                  .attr("y1", dim.inverted ? y[dim.name](dim.unselected.stats.r0) : y[dim.name](dim.unselected.stats.r1))
                  .attr("y2", dim.inverted ? y[dim.name](dim.unselected.stats.r1) : y[dim.name](dim.unselected.stats.r0))
                  .attr("display", showSummaryStatistics ? null : "None");
                d3.select(this).select('#unselectedTypicalLine')
                  .transition()
                    .duration(200)
                  .attr("y1", y[dim.name](dim.unselected.stats.median))
                  .attr("y2", y[dim.name](dim.unselected.stats.median))
                  .attr('display', showSummaryStatistics ? null : "None");
              } else {
                d3.select(this).select('#selectedDispersionRect')
                  .attr('display', 'None');
                d3.select(this).select(".selectedRangeLine")
                  .attr("display", "None");
                d3.select(this).select('#selectedTypicalLine')
                  .attr('display', 'None');
                d3.select(this).select('#unselectedDispersionRect')
                  .attr('display', 'None');
                d3.select(this).select('#unselectedTypicalLine')
                  .attr('display', 'None');
                d3.select(this).select(".unselectedRangeLine")
                  .attr("display", "None");
              }
            }

            if (dim.selected.bins) {
              const histogramScale = d3
                .scaleLinear()
                .range([0, x.step() * x.padding()])
                .domain([0, d3.max(dim.bins, (d) => d.length)]);
                
              d3.select(this).select('.selectedHistogramBin').selectAll('rect')
                .transition()
                  .duration(200)
                .attr("width", (d,i) => histogramScale(dim.selected.bins[i].length));
              if (showHistograms) {
                d3.select(this).select('.selectedHistogramBin').attr('display', null);
              }
            } else {
              d3.select(this).select('.selectedHistogramBin').selectAll('rect')
                .attr("width", 0);
              d3.select(this).select('.selectedHistogramBin').attr("display", "None");
            }
          } else {
            if (dim.type === "numerical") {
              d3.select(this).select('#selectedDispersionRect')
                .attr('display', 'None');
              d3.select(this).select('#unselectedDispersionRect')
                .attr('display', 'None');
              d3.select(this).select('.unselectedRangeLine')
                .attr('display', 'None');
              d3.select(this).select('.selectedRangeLine')
                .attr('display', 'None');
              d3.select(this).select('#selectedTypicalLine')
                .attr('display', 'None');
              d3.select(this).select('#unselectedTypicalLine')
                .attr('display', 'None');
            }
            d3.select(this).select('.selectedHistogramBin')
              .attr("display", "None");
            d3.select(this).select('.selectedHistogramBin').selectAll('rect')
              .attr("width", 0);
          }
        } else {
          if (selected.length > 0) {
            d3.select(this).select('.selectedCategoryRect')
              .attr("display", null);
            d3.select(this).select('.selectedCategoryRect').selectAll('rect')
              .each(function (cat) {
                let pctSelected = cat.numSelected / cat.values.length;
                let pctHeight = pctSelected * (cat.height - 2);
                pctHeight = pctHeight > 0 ? pctHeight : 0;
                let pctY = (cat.y + cat.height - 1) - pctHeight;
                pctY = pctY < cat.y ? cat.y : pctY;
                d3.select(this)
                  .transition()
                    .duration(200)
                  .attr("y", pctY)
                  .attr("height", pctHeight);
              });
              d3.select(this).selectAll('.category_rect')
                .each(function (cat) {
                  d3.select(this).select('title').text(`${cat.name}: ${cat.numSelected} of ${cat.values.length} (${(cat.numSelected / cat.values.length * 100).toFixed(1)}%) tuples selected`);
                });
          } else {
            d3.select(this).select('.selectedCategoryRect')
              .attr("display", "none");
            d3.select(this).selectAll('.category_rect')
              .each(function (cat) {
                d3.select(this).select('title').text(`${cat.name}: ${cat.values.length} tuples`);
              });
          }
        }
      });
  }

  function calculateDimensionCorrelations() {
    const data = (selected && selected.length > 0) ? selected : tuples;
    dimensions.forEach(dim1 => {
      if (dim1.type === 'numerical') {
        dim1.correlationMap = new Map();
        d1 = data.map(d => d[dim1.name]);
        dimensions.forEach(dim2 => {
          if (dim2.type === 'numerical') {
            d2 = data.map(d => d[dim2.name]);
            let d1_filtered = [], d2_filtered = [];
            for (let i = 0; i < d1.length; i++) {
              if (!isNaN(d1[i]) && !isNaN(d2[i])) {
                d1_filtered.push(d1[i]);
                d2_filtered.push(d2[i]);
              }
            }
            r = corr(d1_filtered, d2_filtered);
            dim1.correlationMap.set(dim2.name, r);
          }
        });
      }
    });
  }

  // replace with call to simple statistics
  function corr(d1, d2) {
    let { min, pow, sqrt } = Math;
    let add = (a,b) => a + b;
    let n = min(d1.length, d2.length);
    if (n === 0) {
        return 0;
    }
    [d1, d2] = [d1.slice(0,n), d2.slice(0,n)];
    let [sum1, sum2] = [d1, d2].map(l => l.reduce(add));
    let [pow1, pow2] = [d1, d2].map(l => l.reduce((a,b) => a + pow(b, 2), 0));
    let mulSum = d1.map((n, i) => n * d2[i]).reduce(add);
    let dense = sqrt((pow1 - pow(sum1, 2) / n) * (pow2 - pow(sum2, 2) / n));
    if (dense === 0) {
        return 0
    }
    return (mulSum - (sum1 * sum2 / n)) / dense;
  }

  function getSummaryStatistics(values) {
    // TODO: what is the minimum number of values that calculating stats for makes sense?
    let sortedValues = values.filter(d => d!== null && !isNaN(d)).sort(d3.ascending);
    const stats = {
      min: sortedValues[0],
      max: sortedValues[sortedValues.length - 1],
      // mean: d3.mean(sortedValues),
      median: d3.median(sortedValues),
      count: values.length,
      nullCount: values.length - sortedValues.length,
      extent: d3.extent(sortedValues),
      // stdev: d3.deviation(sortedValues),
      q1: d3.quantileSorted(sortedValues, 0.25),
      q3: d3.quantileSorted(sortedValues, 0.75)
    };
    stats.iqr = stats.q3 - stats.q1;
    stats.r0 = Math.max(stats.min, stats.q1 - stats.iqr * 1.5);
    stats.r1 = Math.min(stats.max, stats.q3 + stats.iqr * 1.5);
    stats.quartiles = [stats.q1, stats.median, stats.q3];
    stats.range = [stats.r0, stats.r1];
    stats.outliers = sortedValues.filter(v => v < stats.r0 || v > stats.r1);
    return stats;
  }

  function calculateSelectionStatistics() {
    // TODO: Optimize when all tuples are selected and none are selected
    // TODO: Complexity optimization as well
    dimensions.forEach(dim => {
      if (dim.type === "numerical") {
        // calculate stats for selected values
        let selectedValues = selected.map(d => d[dim.name]);
          // .filter(d => d!== null && !isNaN(d))
          // .sort(d3.ascending);
        const selectedStats = getSummaryStatistics(selectedValues);
        const selectedBins = d3.bin()
          .value(d => d[dim.name])
          .thresholds(dim.bins.length)
          .domain(dim.stats.extent)
          (selected);
        dim.selected = {
          bins: selectedBins,
          stats: selectedStats
        };
        
        // calculate stats for unselected values
        let unselectedValues = unselected.map(d => d[dim.name]);
          // .filter(d => d!== null && !isNaN(d))
          // .sort(d3.ascending);
        const unselectedStats = getSummaryStatistics(unselectedValues);
        // const unselectedBins = d3.bin()
        //   .value(d => d[dim.name])
        //   .thresholds(dim.bins.length)
        //   .domain(dim.stats.extent)
        //   (unselected);
        dim.unselected = {
          // bins: unselectedBins,
          stats: unselectedStats
        };
      } else if (dim.type === "temporal") {
        const selectedBins = d3.bin()
          .value(d => d[dim.name])
          .thresholds(dim.bins.length)
          .domain(y[dim.name].domain())
          (selected);
        dim.selected = {
          bins: selectedBins,
        };
      } else if (dim.type === 'categorical') {
        if (selected.length === tuples.length || selected.length === 0) {
          dim.categories.map(cat => cat.numSelected = selected.length === 0 ? 0 : cat.values.length);
        } else {
          let groupedValues = d3.group(selected, d => d[dim.name]);
          dim.categories.map(cat => {
            if (groupedValues.has(cat.name)) {
              cat.numSelected = groupedValues.get(cat.name).length;
            } else {
              cat.numSelected = 0;
            }
          });
        }
      }
    });
  }

  function selectTuples(actives) {
    unselected = [];
    if (actives && actives.length > 0) {
      selected = [];

      tuples.map(function (t) {
        return actives.every(function (active) {
          if (active.dimension.type === "categorical") {
            return active.extent.indexOf(t[active.dimension.name]) >= 0;
          } else {
            return active.dimension.inverted ? 
              (
                t[active.dimension.name] <= active.extent[1] &&
                t[active.dimension.name] >= active.extent[0]
              ) :
              (
                t[active.dimension.name] <= active.extent[0] &&
                t[active.dimension.name] >= active.extent[1]
              );
            // return (
            //   t[active.dimension.name] <= active.extent[0] &&
            //   t[active.dimension.name] >= active.extent[1]
            // );
          }
        }) ? selected.push(t) : unselected.push(t);
      });
    } else {
      selected = tuples;
    }

    calculateSelectionStatistics();
    calculateDimensionCorrelations();
    // updateCorrelationGraphics();
    drawCorrelationGraphics();
    updateSelectionGraphics();
  }

  function computeTupleLines() {
    tupleLines = new Map();
    tuples.map(t => {
      let yCoordinates = dimensions.map((dim, i) => {
        if (dim.type === 'categorical') {
          const cat = dim.categories.find(cat => cat.name === t[dim.name]);
          const jitter = Math.random() * (cat.height / 4) - (cat.height / 8);
          const yPos = cat.center + jitter;
          return yPos;
        } else {
          return (isNaN(t[dim.name]) || t[dim.name] === null) ? NaN : y[dim.name](t[dim.name]);
        }
      });
      tupleLines.set(t, yCoordinates);
    });
  }

  function path(tuple, ctx, pathColor) {
    let yCoordinates = tupleLines.get(tuple);
    dimensions.map(function (dim, i) {
      if (i < dimensions.length - 1) {
        const nextDim = dimensions[i + 1];
        if (!isNaN(yCoordinates[i]) && !isNaN(yCoordinates[i+1])) {
          ctx.beginPath();
          ctx.strokeStyle = pathColor;
          ctx.moveTo(x(dim.name) + axisBarWidth / 2, yCoordinates[i]);
          ctx.lineTo(x(nextDim.name) - axisBarWidth / 2, yCoordinates[i + 1]);
          ctx.stroke();
          // if (dim.type === 'categorical') {
          //   ctx.beginPath();
          //   ctx.moveTo(x(dim.name) + axisBarWidth / 2, yCoordinates[i]);
          //   if (nextDim.type === 'categorical') {
          //     ctx.lineTo(x(nextDim.name) - axisBarWidth / 2, yCoordinates[i + 1]);
          //   } else {
          //     ctx.lineTo(x(nextDim.name), yCoordinates[i + 1]);
          //   }
          //   ctx.stroke();
          // } else {
          //   ctx.beginPath();
          //   ctx.moveTo(x(dim.name), yCoordinates[i]);
          //   if (nextDim.type === 'categorical') {
          //     ctx.lineTo(x(nextDim.name) - axisBarWidth / 2, yCoordinates[i + 1]);
          //   } else {
          //     ctx.lineTo(x(nextDim.name), yCoordinates[i + 1]);
          //   }
          //   ctx.stroke();
          // }
        }
      }
    });
  }

  function drawLines() {
    drawBackgroundLines();
    drawForegroundLines();
  };

  function drawForegroundLines() {
    var lineColor;
    if (lineColorDimension) {
      lineColor = d3.scaleSequential(t => d3.interpolateYlGnBu((t + 0.25) * .75)).domain(d3.extent(tuples, d => d[lineColorDimension]));
    }
    foreground.clearRect(
      -canvasMargin,
      -canvasMargin,
      x.range()[1] + canvasMargin * 2,
      pcpHeight + canvasMargin * 2
    );

    if (showSelected) {
      selected.map(function (d) {
        const c = lineColor ? lineColor(d[lineColorDimension]) : selectedLineColor;
        path(d, foreground, c);
      });
    }
  };

  function drawBackgroundLines() {
    background.clearRect(
      -canvasMargin,
      -canvasMargin,
      x.range()[1] + canvasMargin * 2,
      pcpHeight + canvasMargin * 2
    );
    if (showUnselected) {
      unselected.map(function (d) {
        path(d, background, unselectedLineColor);
      });
    }
  };

  chart.setDimensionSelection = function(dimensionName, selection) {
    const dim = dimensions.find(d => d.name === dimensionName);
    if (dim) {
      if (dim.type === 'categorical') {
        var selectedCategories = new Set();
        dim.categories.map(cat => {
          selection.map(s => {
            if (s === cat.name) { selectedCategories.add(cat); }
          });
        });

        dim.selectedCategories.clear();
        selectedCategories.forEach(c => dim.selectedCategories.add(c.id));

        svg.selectAll(`#dim_${dim.id}.dimension`).selectAll('.category_rect')
          .each(function(cat) {
            if (selectedCategories.has(cat)) {
              d3.select(this)
                .attr('fill', highlightFill)
                .attr('fill-opacity', 0.3)
                .attr('stroke', '#000')
                .attr('stroke-width', 1.2);
            } else {
              d3.select(this)
                .attr("stroke", null)
                .attr("stroke-width", null)
                .attr("fill", null)
                .attr("fill-opacity", null);
            }
          });
        brush();
      } else if (dim.type === 'numerical') {
        const selectedRange = [Math.min(y[dim.name](selection[0]), y[dim.name](selection[1])), Math.max(y[dim.name](selection[0]), y[dim.name](selection[1]))];
        d3.select(`.dimension#dim_${dim.id}`).select(".brush").call(y[dim.name].brush.move, selectedRange);
      }
    }
  };

  chart.selectedTuples = function(value) {
    if (!arguments.length) {
      return selected;
    }
    return chart;
  };

  chart.unselectedTuples = function(value) {
    if (!arguments.length) {
      return unselected;
    }
    return chart;
  };

  chart.getVisibleDimensions = function() {
    if (dimensions) {
      return dimensions.map(d => ({
        name: d.name,
        type: d.type,
        range: d.stats ? d.stats.extent : null,
        inverted: d.inverted,
        categories: d.categories ? d.categories.map(c => c.name) : null,
        selection: d.selectedCategories ? [...d.selectedCategories].map(idx => d.categories.find(c => c.id === idx).name) : d.currentSelection ? d.currentSelection : []
      }));
    }
    return [];
  };

  chart.selectionChangeHandler = function(value) {
    if (!arguments.length) {
      return dimensionSelectionChangeHandler;
    }
    dimensionSelectionChangeHandler = value;
    return chart;
  };

  chart.correlationClickHandler = function(value) {
    if (!arguments.length) {
      return correlationClickHandler;
    }
    correlationClickHandler = value;
    return chart;
  };

  // chart.activeSelections = function(value) {
  //   if (!arguments.length) {
  //     return actives;
  //   }
  //   actives = value;

  //   return chart;
  // };

  chart.axisSpacing = function (value) {
    if (!arguments.length) {
      return axisSpacing;
    }
    axisSpacing = value;
    _resizeChart();
    return chart;
  };

  chart.width = function (value) {
    if (!arguments.length) {
      return width;
    }
    width = value - margin.left - margin.right;
    _resizeChart();
    return chart;
  };

  chart.height = function (value) {
    if (!arguments.length) {
      return height;
    }
    height = value - margin.top - margin.bottom;
    _resizeChart();
    return chart;
  };

  chart.size = function (value) {
    if (!arguments.length) {
      return [width, height];
    }
    width = value[0] - margin.left - margin.right;
    height = value[1] - margin.top - margin.bottom;
    _resizeChart();
    return chart;
  };

  chart.titleText = function (value) {
    if (!arguments.length) {
      return titleText;
    }
    titleText = value;
    return chart;
  };
  
  chart.setShowHistograms = function (value) {
    if (!arguments.length) {
      return showHistograms;
    }
    showHistograms = value;
    if (svg) {
      svg.selectAll(".histogramBin")
        .attr('display', showHistograms ? null : 'none');
      svg.selectAll(".selectedHistogramBin")
        .attr('display', showHistograms ? null : 'none');
    }
    return chart;
  };

  chart.showAxisTicks = function (value) {
    if (!arguments.length) {
      return showAxisTicks;
    }
    showAxisTicks = value;
    if (svg) {
      svg.selectAll(".tick line")
        .attr("display", showAxisTicks ? null : "none");
    }
    return chart;
  };
  
  chart.showAxisTickLabels = function (value) {
    if (!arguments.length) {
      return showAxisTickLabels;
    }
    showAxisTickLabels = value;
    if (svg) {
      svg.selectAll(".axis text")
        .attr("display", showAxisTickLabels ? null : "none");
    }
    return chart;
  };

  chart.showSelectedLines = function (value) {
    if (!arguments.length) {
      return showSelected;
    }
    showSelected = value;
    if (foreground) {
      drawLines();
    }
    return chart;
  };

  chart.showUnselectedLines = function (value) {
    if (!arguments.length) {
      return showUnselected;
    }
    showUnselected = value;
    if (background) {
      drawLines();
    }
    return chart;
  };

  chart.showSummaryStatistics = function (value) {
    if (!arguments.length) {
      return showSummaryStatistics;
    }

    showSummaryStatistics = value;

    if (svg) {
      svg.selectAll(".dimension").each(function (dim) {
        if (dim.type === "numerical") {
          d3.select(this).select(".rangeRect")
            .attr("display", showSummaryStatistics ? null : "None");
          d3.select(this).select(".dispersionRect")
            .attr("display", showSummaryStatistics ? null : "None");
          d3.select(this).select(".typicalLine")
            .attr("display", showSummaryStatistics ? null : "None");
          d3.select(this).select("#selectedDispersionRect")
            .attr("display", showSummaryStatistics ? (selected.length != tuples.length && selected.length > 0) ? null : "None" : "None");
          d3.select(this).select("#selectedTypicalLine")
            .attr("display", showSummaryStatistics ? (selected.length != tuples.length && selected.length > 0) ? null : "None" : "None");
          d3.select(this).select(".selectedRangeLine")
            .attr("display", showSummaryStatistics ? null : "None");
          d3.select(this).select("#unselectedDispersionRect")
            .attr("display", showSummaryStatistics ? (selected.length != tuples.length && selected.length > 0) ? null : "None" : "None");
          d3.select(this).select("#unselectedTypicalLine")
            .attr("display", showSummaryStatistics ? (selected.length != tuples.length && selected.length > 0) ? null : "None" : "None");
          d3.select(this).select(".unselectedRangeLine")
            .attr("display", showSummaryStatistics ? null : "None");
        }
      });
    }
    return chart;
  };

  chart.selectedLineColor = function (value) {
    if (!arguments.length) {
      return selectedLineColor;
    }
    selectedLineColor = value;
    if (foreground) {
      drawForegroundLines();
    }
    return chart;
  };

  chart.unselectedLineColor = function (value) {
    if (!arguments.length) {
      return unselectedLineColor;
    }
    unselectedLineColor = value;
    if (foreground) {
      drawBackgroundLines();
    }
    return chart;
  };

  chart.selectedLineOpacity = function (value) {
    if (!arguments.length) {
      return selectedLineOpacity;
    }
    selectedLineOpacity = value;
    if (foreground) {
      foreground.globalAlpha = selectedLineOpacity;
      drawForegroundLines();
    }
    return chart;
  };

  chart.unselectedLineOpacity = function (value) {
    if (!arguments.length) {
      return unselectedLineOpacity;
    }
    unselectedLineOpacity = value;
    if (background) {
      background.globalAlpha = unselectedLineOpacity;
      drawBackgroundLines();
    }
    return chart;
  };

  chart.margin = function (value) {
    if (!arguments.length) {
      return margin;
    }
    oldChartWidth = width + margin.left + margin.right;
    oldChartHeight = height + margin.top + margin.bottom;
    margin = value;
    width = oldChartWidth - margin.left - margin.right;
    height = oldChartHeight - margin.top - margin.bottom;
    _resizeChart();
    return chart;
  };

  chart.categoryHeightMode = function (value) {
    if (!arguments.length) {
      return categoryHeightMode;
    }
    if (value === "proportional" || value === "equal") {
      categoryHeightMode = value;
      // TODO: replace with a specific update to only the categorical rects
      _resizeChart();
    }
    return chart;
  }

  chart.lineColorDimension = function(value) {
    if (!arguments.length) {
      return lineColorDimension;
    }
    lineColorDimension = value;
    // TODO: add this to select lines function?
    if (lineColorDimension) {
      if (selected) {
        selected.sort((a,b) => d3.ascending(a[lineColorDimension], b[lineColorDimension]));
      }  
    }
    drawLines();
    return chart;
  };

  chart.arrangeByDimension = function(arrangeDimensionName) {
    if (!arguments.length && !dimensions) {
      return;
    }

    // first make sure the arrange dimension name exists
    const arrangeDim = dimensions.find(d => d.name === arrangeDimensionName);
    if (!arrangeDim) {
      console.error("Couldn't arrange dimensions because given dimension name not found");
      return;
    }

    var newDimArray = [];
    if (arrangeDim.type === "numerical") {
      var posDim = [];
      var negDim = [];
      var arrangeDimIndex = -1;
      // iterate over dimensions
      dimensions.forEach(d => {
        if (d === arrangeDim) {
          // keep arrangeDim position relative to non-numerical dimensions
          newDimArray.push(d);
          arrangeDimIndex = newDimArray.length - 1;
        } else if (d.type !== "numerical") {
          // keep non-numerical dimension positions intact relative to arrange dimension
          newDimArray.push(d);
        } else {
          // group numerical dimensions by positive and negative correlations
          const r = arrangeDim.correlationMap.get(d.name);
          if (r < 0) {
            negDim.push({
              r: r,
              dim: d
            });
          } else {
            posDim.push({
              r: r,
              dim: d
            });
          }
        }
      });
      if (negDim.length > 0) {
        // sort negative correlation dimensions
        negDim.sort((a,b) => d3.descending(a.r, b.r));
        // splice before arrange dimension in new dim list
        newDimArray.splice(arrangeDimIndex, 0, ...negDim.map(d => d.dim));
        arrangeDimIndex = arrangeDimIndex + negDim.length;
      }
      
      if (posDim.length > 0) {
        // sort negative correlation dimensions
        posDim.sort((a,b) => d3.descending(a.r, b.r));
        // splice before arrange dimension in new dim list
        newDimArray.splice(arrangeDimIndex + 1, 0, ...posDim.map(d => d.dim));
      }
    } else if (arrangeDim.type === "categorical") {
      var tempDim = [];
      var numDim = [];
      var catDim = [];
      newDimArray.push(arrangeDim);
      dimensions.forEach(d => {
        if (d !== arrangeDim) {
          if (d.type === "categorical") {
            catDim.push(d);
          } else if (d.type === "numerical") {
            numDim.push(d);
          } else {
            tempDim.push(d);
          }
        }
      });
      if (catDim.length > 0) {
        catDim.sort((a,b) => d3.ascending(a.categories.length, b.categories.length));
        newDimArray = newDimArray.concat(catDim);
      }
      if (numDim.length > 0) {
        newDimArray = newDimArray.concat(numDim);
      }
      if (tempDim.length > 0) {
        newDimArray = newDimArray.concat(tempDim);
      }
    } else if (arrangeDim.type === "temporal") {
      var tempDim = [];
      var numDim = [];
      var catDim = [];
      newDimArray.push(arrangeDim);
      dimensions.forEach(d => {
        if (d !== arrangeDim) {
          if (d.type === "categorical") {
            catDim.push(d);
          } else if (d.type === "numerical") {
            numDim.push(d);
          } else {
            tempDim.push(d);
          }
        }
      });
      if (tempDim.length > 0) {
        newDimArray = newDimArray.concat(tempDim);
      }
      if (catDim.length > 0) {
        catDim.sort((a,b) => d3.ascending(a.categories.length, b.categories.length));
        newDimArray = newDimArray.concat(catDim);
      }
      if (numDim.length > 0) {
        newDimArray = newDimArray.concat(numDim);
      }
    }

    dimensions = newDimArray;
    const dimNames = dimensions.map(d => d.name);
    x.domain(dimNames);
    svg.selectAll(".dimension").each(function (dim) {
      d3.select(this).attr("transform", function (d) {
        return `translate(${x(d.name)})`;
      });
    });

    computeTupleLines();
    drawLines();
    drawCorrelationGraphics();

    return chart;
  }

  return chart;
};
