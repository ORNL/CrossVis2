var histogramChart = function() {
  let margin = {top: 40, right: 20, bottom: 20, left: 40};
  let width = 900 - margin.left - margin.right;
  let height = 200 - margin.bottom - margin.top;
  let xValue;
  let yValue;
  let selectedBinFill = "steelblue";
  let contextBinFill = "#DDD";
  let brushFillColor = "orange";
  let titleText;
  let xAxisTitle = "";
  let rangeBrushHandler;
  var _chartData;
  var chartDiv;
  var _selectedChartData = null;
  var svg;
  var g;
  var bins;
  var selectedBins;
  var x, y;
  var lastBrushSelection;
  var brush;
  var showPercentSelected = true;
  var numBins = -1;

  function chart(selection, data) {
    _chartData = data;
    chartDiv = selection;
    chartID = '_' + Math.random().toString(36).substr(2,9);
    drawChart();
  }

  const xAxis = g => g
    .attr("class", "axis--x")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickSizeOuter(0).ticks(width / 80))
    .call(g => g.append('text')
      .attr('x', width)
      .attr('y', margin.bottom - 2)
      .attr('fill', '#000')
      .attr('font-weight', 'bold')
      .attr('text-anchor', 'end')
      .text(xAxisTitle + ' →'));

  const yAxis = g => g
    .attr("class", "axis--y")
    .call(d3.axisLeft(y).ticks(height / 14))
    .call(g => g.select(".domain").remove())
    .call(g => g.append('text')
      .attr("x", 4 + (-margin.left))
      .attr("y", -8)
      .attr('fill', '#000')
      .attr("text-anchor", "start")
      .attr("font-weight", 'bold')
      .text('↑ Count'));
  
  const brushed = (event) => {
    let s = event.selection || x.range();
    // let s = d3.event.selection || lastBrushSelection || x.range();
    if (event.selection) {
      lastBrushSelection = event.selection.map(x.invert, x);
    }

    if (rangeBrushHandler) {
      rangeBrushHandler(s.map(x.invert, x));
    }
  };

  function drawChart() {
    if (_chartData && chartDiv) {
      chartDiv.selectAll('*').remove();

      svg = chartDiv.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

      g = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

      x = d3.scaleLinear()
        .domain(d3.extent(_chartData, xValue))
        .range([0, width]);

      if (numBins === -1) {
        bins = d3.bin()
          .value(xValue)
          .domain(x.domain())
          (_chartData);
      } else {
        bins = d3.bin()
          .value(xValue)
          .domain(x.domain())
          .thresholds(numBins)
          (_chartData);
      }
      // bins = d3.bin()
      //   .value(xValue)
      //   .domain(x.domain())
      //   (_chartData);
            
      if (_selectedChartData) {
        selectedBins = d3.bin()
          .value(xValue)
          .thresholds(bins.length)
          .domain(x.domain())
          (_selectedChartData);
      }

      if (showPercentSelected || _selectedChartData === null) {
        y = d3.scaleLinear()
          .domain([0, d3.max(bins, d => d.length)]).nice()
          .range([height, 0]);
      } else {
        y = d3.scaleLinear()
          .domain([0, d3.max(selectedBins, d => d.length)]).nice()
          .range([height, 0]);
      }

      g.append('g')
        .attr('class', 'bins');

      drawBins();

      g.append('g')
        .call(xAxis);

      g.append('g')
        .call(yAxis);

      // brush = d3.brushX()
      //   .extent([[0,0], [width,height]])
      //   .on("end", brushed);

      // g.append("g")
      //   .attr("class", "brush")
      //   .call(brush);

      // g.selectAll('.brush rect.selection')
      //   .attr('stroke', '#999')
      //   .attr('fill', brushFillColor)
      //   .attr('fill-opacity', .2);
    }
  };

  function resizeChart() {
    if (svg) {
      svg.attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
      x.range([0, width]);
      y.range([height, 0]);

      g.select(".axis--x").remove();
      g.select(".axis--y").remove();
      g.append('g')
        .call(xAxis);
      g.append('g')
        .call(yAxis);

      if (numBins === -1) {
        bins = d3.bin()
          .value(xValue)
          .domain(x.domain())
          (_chartData);
      } else {
        bins = d3.bin()
          .value(xValue)
          .domain(x.domain())
          .thresholds(numBins)
          (_chartData);
      }
      // bins = d3.bin()
      //   .value(xValue)
      //   .domain(x.domain())
      //   (_chartData);

      // brush.extent([[0,0], [width,height]]);

      // if (lastBrushSelection) {
      //   brush.on("end", null);
      //   console.log(lastBrushSelection);
      //   let resizedBrushSelection = [x(lastBrushSelection[0]), x(lastBrushSelection[1])];
      //   console.log(resizedBrushSelection);
      //   g.select("g.brush")
      //     .call(brush)
      //     .call(brush.move, resizedBrushSelection);
      //   brush.on("end", brushed);
      // } else {
      //   g.select("g.brush")
      //     .call(brush);
      // }

      drawBins();
    }
  };

  function drawBins() {
    if (g) {
      let binsG = g.select('.bins');
      binsG.selectAll('rect.bin').remove();

      if (showPercentSelected) {
        binsG.append('g')
          .attr('fill', !_selectedChartData ? selectedBinFill : contextBinFill)
          .selectAll('rect')
          .data(bins)
          .join('rect')
            .attr('class', 'bin')
            .attr('x', d => x(d.x0) + 1)
            .attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 1))
            .attr('y', d => y(d.length))
            .attr('height', d => y(0) - y(d.length))
            .append('title')
              .text((d,i) => hoverText(i));
              // .text(d => `[${d.x0}, ${d.x1}]\nCount: ${d.length}`);

        drawSelectedBins();
      } else {
        if (_selectedChartData) {
          drawSelectedBins();
        } else {
          binsG.append('g')
            .attr('fill', selectedBinFill)
            .selectAll('rect')
            .data(bins)
            .join('rect')
              .attr('class', 'bin')
              .attr('x', d => x(d.x0) + 1)
              .attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 1))
              .attr('y', d => y(d.length))
              .attr('height', d => y(0) - y(d.length))
              .append('title')
                .text((d,i) => hoverText(i));
                // .text(d => `[${d.x0}, ${d.x1}]\nCount: ${d.length}`);
        }
      }
    }
  };

  function hoverText(i) {
    if (selectedBins) {
      return `[${bins[i].x0}, ${bins[i].x1}]\nSelected Count: ${selectedBins[i].length}\nTotal Count: ${bins[i].length}`
    } else {
      return `[${bins[i].x0}, ${bins[i].x1}]\nTotal Count: ${bins[i].length}`
    }
  }

  function drawSelectedBins() {
    let binsG = g.select('.bins');
    binsG.selectAll('rect.selectedBin').remove();

    if (_selectedChartData) {      
      binsG.append('g')
        .attr('fill', selectedBinFill)
        .selectAll('rect')
        .data(selectedBins)
        .join('rect')
          .attr('class', 'selectedBin')
          .attr('x', d => x(d.x0) + 1)
          .attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 1))
          .attr('y', d => y(d.length))
          .attr('height', d => y(0) - y(d.length))
          .append('title')
            .text((d,i) => hoverText(i));
            // .text((d, i) => `[${d.x0}, ${d.x1}]\nCount: ${d.length}`);
    }
  };

  chart.rangeBrushHandler = function(value) {
    if (!arguments.length) {
      return rangeBrushHandler;
    }
    rangeBrushHandler = value;
    return chart;
  }

  chart.margin = function(value) {
    if (!arguments.length) {
      return margin;
    }
    oldChartWidth = width + margin.left + margin.right;
    oldChartHeight = height + margin.top + margin.bottom;
    margin = value;
    width = oldChartWidth - margin.left - margin.right;
    height = oldChartHeight - margin.top - margin.bottom;
    return chart;
  };

  chart.xValue = function(value) {
    if (!arguments.length) {
      return xValue;
    }
    xValue = value;
    return chart;
  };

  chart.width = function(value) {
    if (!arguments.length) {
      return width;
    }
    width = value - margin.left - margin.right;
    return chart;
  };

  chart.height = function(value) {
    if (!arguments.length) {
      return height;
    }
    height = value - margin.top - margin.bottom;
    resizeChart();
    return chart;
  };

  chart.titleText = function(value) {
    if (!arguments.length) {
      return titleText;
    }
    titleText = value;
    return chart;
  };

  chart.xAxisTitle = function(value) {
    if (!arguments.length) {
      return this.xAxisTitle;
    }
    xAxisTitle = value;
    return chart;
  };

  chart.selected = function(value) {
    if (!arguments.length) {
      return _selectedChartData;
    }
    _selectedChartData = value;
    if (bins) {
      selectedBins = d3.bin()
        .value(xValue)
        .thresholds(bins.length)
        .domain(x.domain())
        (_selectedChartData);

      if (!showPercentSelected) {
        y.domain([0, d3.max(selectedBins, d => d.length)]).nice();
        g.select(".axis--y").remove();
        g.append('g').call(yAxis);
      }
      drawBins();
    }
    return chart;
  };

  chart.selectedBinFill = function(value) {
    if (!arguments.length) {
      return selectedBinFill;
    }
    selectedBinFill = value;
    if (g) {
      g.select('.bins').selectAll('rect.selectedBin')
        .attr("fill", selectedBinFill);
    }
    return chart;
  };

  chart.contextBinFill = function(value) {
    if (!arguments.length) {
      return contextBinFill;
    }
    contextBinFill = value;
    if (g) {
      g.select('.bins').selectAll('rect.bin')
        .attr('fill', !_selectedChartData ? selectedBinFill : contextBinFill)
    }
    return chart;
  };

  chart.showPercentSelected = function(value) {
    if (!arguments.length) {
      return showPercentSelected;
    }
    if (showPercentSelected !== value) {
      showPercentSelected = value;
      
      if (showPercentSelected || _selectedChartData === null) {
        y.domain([0, d3.max(bins, d => d.length)]).nice();
      } else {
        y.domain([0, d3.max(selectedBins, d => d.length)]).nice();
      }

      g.select(".axis--y").remove();
      g.append('g').call(yAxis);

      drawBins();
    }
    return chart;
  };

  chart.binThresholds = function(value) {
    if (!arguments.length) {
      return numBins;
    }
    numBins = value;
    if (_chartData) {
      if (numBins === -1) {
        bins = d3.bin()
          .value(xValue)
          .domain(x.domain())
          (_chartData);
      } else {
        bins = d3.bin()
          .value(xValue)
          .domain(x.domain())
          .thresholds(numBins)
          (_chartData);
      }

      if (_selectedChartData) {
        selectedBins = d3.bin()
          .value(xValue)
          .thresholds(bins.length)
          .domain(x.domain())
          (_selectedChartData);
      }

      if (showPercentSelected || _selectedChartData === null) {
        y.domain([0, d3.max(bins, d => d.length)]).nice();
      } else {
        y.domain([0, d3.max(selectedBins, d => d.length)]).nice();
      }
      
      x.domain(d3.extent(_chartData, xValue));

      g.select(".axis--y").remove();
      g.select(".axis--x").remove();
      g.append('g').call(yAxis);
      g.append('g').call(xAxis);

      drawBins();
    }
    return chart;
  };

  chart.dimensions = function(newWidth, newHeight) {
    width = newWidth - margin.left - margin.right;
    height = newHeight - margin.top - margin.bottom;
    resizeChart();
    return chart;
  };

  return chart;
}