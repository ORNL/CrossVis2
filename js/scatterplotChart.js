var scatterplotChart = function () {
  let margin = {top:20, right:20, bottom: 20, left: 20};
  let chartSize = 400;
  let selectedColor = "steelblue";
  let unselectedColor = "#CCC";
  let selectedOpacity = 0.3;
  let unselectedOpacity = 0.05;
  let regressionLineStroke = "#212121";
  let regressionLineOpacity = 0.4;
  let correlationRectStroke = "#646464";
  let xValue;
  let yValue;
  let sizeValue;
  let xAxisTitle = "";
  let yAxisTitle = "";
  let _chartData;
  let _chartDiv;
  let selected;
  let unselected;
  let svg;
  let g;
  let x, y, radius;
  let maxCorrRectSize = 30;
  let correlationColorScale = d3.scaleSequential(d3.interpolateRdBu).domain([-1, 1]);
  let showSelectedDots = true;
  let showUnselectedDots = true;
  let showRegressionLine = true;
  let numNull = 0;
  const numberFormat = d3.format(",");
  const percentFormat = d3.format(".0%");
  let correlationValue = 0;
  
  function chart(selection, data, selectedData = null) {
    _chartData = data.filter(d => !isNaN(xValue(d)) && xValue(d) !== null && !isNaN(yValue(d)) && yValue(d) !== null);
    numNull = data.length - _chartData.length;
    _chartDiv = selection;
    // TODO: Filter out null values
    // nulls = new Set(_chartData.filter((d => isNaN(xValue(d)) || xValue(d) === null || isNaN(yValue(d)) || yValue(d) === null)));
    // console.log(`Null count is ${nulls.size}`);
    // console.log(_chartData.length);
    // console.log(_chartData.filter(d => !isNaN(xValue(d)) && xValue(d) !== null && !isNaN(yValue(d)) && yValue(d) !== null));
    // _chartData = _chartData.filter((d => !isNaN(xValue(d)) && xValue(d) !== null && !isNaN(yValue(d)) && yValue(d) !== null))
    // console.log(_chartData.length);

    if (selectedData !== null) {
      selected = new Set(selectedData.filter(v => _chartData.includes(v)));
      unselected = new Set();
      _chartData.forEach(d => {
        if (!selected.has(d)) {
          unselected.add(d);
        }
      });
    } else {
      selected = new Set(_chartData);
      unselected = new Set();
    }
    drawChart();
  }

  function drawChart() {
    if (_chartDiv) {
      _chartDiv.selectAll('*').remove();
      
      if (_chartData) {
        svg = _chartDiv.append('svg')
          .attr('width', chartSize + margin.left + margin.right)
          .attr('height', chartSize + margin.top + margin.bottom);

        svg.append("defs")
          .append("clipPath")
          .attr("id", "clip")
          .append("rect")
          .attr("width", chartSize)
          .attr("height", chartSize);
        
        g = svg.append('g')
          .attr('transform', `translate(${margin.left}, ${margin.top})`);

        x = d3.scaleLinear()
          .range([0, chartSize])
          .domain(d3.extent(_chartData, xValue)).nice();

        y = d3.scaleLinear()
          .range([chartSize, 0])
          .domain(d3.extent(_chartData, yValue)).nice();

        radius = sizeValue ? 
          d3.scaleLinear()
            .range([3, 12])
            .domain(d3.extent(_chartData, sizeValue)) :
            null;
        
        const xAxis = g => g
          .attr("class", "axis axis--x")
          .attr("transform", `translate(0, ${chartSize})`)
          .call(d3.axisBottom(x).ticks(chartSize / 80))
          .call(g => g.select(".domain").remove())
          .call(g => g.append("text")
            .attr("x", chartSize)
            .attr("y", 30)
            .attr("fill", "#000")
            .attr("font-weight", "bold")
            .attr("font-size", 12)
            .attr("text-anchor", "end")
            .text(xAxisTitle + ' →'));
        
        g.append("g")
          .attr("transform", `translate(0,${chartSize})`)
          .call(xAxis);
        
        const yAxis = g => g
          .attr("class", "axis axis--y")
          .call(d3.axisLeft(y).ticks(chartSize/20))
          .call(g => g.select(".domain").remove())
          .call(g => g.append("text")
            .attr("x", 4 + (-margin.left))
            .attr("y", -10)
            .attr("fill", "#000")
            .attr("font-weight", "bold")
            .attr("font-size", 12)
            .attr("text-anchor", "start")
            .text('↑ ' + yAxisTitle));

        g.append("g")
          .call(yAxis);

        const grid = g => g
          .attr("stroke", "#000")
          .attr('stroke-opacity', 0.1)
          .call(g => g.append('g')
            .selectAll("line")
            .data(x.ticks())
            .join("line")
              .attr("x1", d => 0.5 + x(d))
              .attr("x2", d => 0.5 + x(d))
              .attr("y1", 0)
              .attr("y2", chartSize))
          .call(g => g.append('g')
            .selectAll("line")
            .data(y.ticks())
            .join("line")
              .attr("x1", 0)
              .attr("x2", chartSize)
              .attr("y1", d => 0.5 + y(d))
              .attr("y2", d => 0.5 + y(d)));
        
        g.append("rect")
          .attr("width", chartSize)
          .attr("height", chartSize)
          .attr("fill", "white")
          .attr("stroke", "none");
          
        g.append("g")
          .call(grid);

        // let corrRectSize = Math.min(margin.left, margin.bottom) - 8;
        let corrRectSize = margin.top - 8;
        corrRectSize = corrRectSize > maxCorrRectSize ? maxCorrRectSize : corrRectSize;
        // let corrRectSize = margin.bottom < margin.left ? margin.bottom : margin.left;
        // corrRectSize = corrRectSize > maxCorrRectSize ? maxCorrRectSize - 8 : corrRectSize - 4;
        g.append("rect")
          .attr("class", "corrRect")
          .attr("stroke", correlationRectStroke)
          .attr("fill", "#fff")
          .attr("rx", 2)
          .attr("rx", 2)
          // .attr("transform", `translate(${-corrRectSize - 7},${chartSize + 7})`)
          .attr("transform", `translate(${chartSize-corrRectSize},${-corrRectSize - 6})`)
          .attr("width", corrRectSize)
          .attr("height", corrRectSize)
          .append("title")
            .text("Sample Correlation");
          
        g.append("text")
          .attr("class", "corrText")
          .attr("x", chartSize - corrRectSize - 4)
          .attr("y", -(corrRectSize/2))
          .attr("fill", "#000")
          .attr("font-weight", "bold")
          .attr("font-size", 12)
          .attr("text-anchor", "end")
          .text("Correlation: r = 0");
          // .text(`0 selected • 0 nulls • r = NaN`);

        g.append("g")
          .attr("class", "unselectedDots")
          .attr("stroke", "none");
        
        g.append("g")
          .attr("class", "selectedDots")
          .attr("stroke", "none");
        
        g.append("line")
          .attr("class", "regressionLine")
          .attr("clip-path", `url(#clip)`)
          .attr("stroke", regressionLineStroke)
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "2,2")
          .attr("stroke-opacity", regressionLineOpacity)
          .attr("x1", x(x.domain()[0]))
          .attr("x2", x(x.domain()[1]))
          .attr("y1", 0)
          .attr("y2", 0)
          .attr("display", showRegressionLine ? null : "none");

        drawUnselectedDots();
        drawSelectedDots();
        drawRegressionLine();
        fillCorrelationRect();
        // drawStatusText();
      }
    }
  };

  const hoverText = (datum) => {
    var text = '';
    let entries = Object.entries(datum);
    for (let i = 0; i < entries.length; i++) {
      text += `${entries[i][0]}: ${entries[i][1]}`;
      if (i + 1 < entries.length) {
        text += '\n';
      }
    }
    return text;
  };

  // function drawStatusText() {
  //   if (g) {
  //     const selectedText = `${numberFormat(selected.size)} / ${numberFormat(_chartData.length)} (${percentFormat(selected.size / _chartData.length)}) selected,  ${numNull} nulls,  r = ${correlationValue.toFixed(2)}`;
  //     g.select('.statusText')
  //       .text(selectedText);
  //   }
  // }

  function drawRegressionLine() {
    if (g) {
      if (showRegressionLine) {
        const regrData = [];
        selected.forEach(d => regrData.push([xValue(d), yValue(d)]))
        // _chartData.map(d => [xValue(d), yValue(d)]);
        if (regrData.length > 0) {
          const regr = ss.linearRegression(regrData);
          const regrLine = ss.linearRegressionLine(regr);
          g.select(".regressionLine")
            // .transition()
            // .duration(500)
            .attr("y1", y(regrLine(x.domain()[0])))
            .attr("y2", y(regrLine(x.domain()[1])))
            .attr("display", null);
        } else {
          g.select(".regressionLine")
            .attr("display", "none");
        }
      } else {
        g.select(".regressionLine")
            .attr("display", "none");
      }
    }
  }

  function drawSelectedDots() {
    if (g) {
      g.select(".selectedDots").selectAll("*").remove();
      if (showSelectedDots) {
        g.select(".selectedDots")
          .selectAll("g")
          .data([...selected])
          .join("circle")
            .attr("class", "selectedDot")
            .attr("fill", selectedColor)
            .attr("fill-opacity", selectedOpacity)
            .attr("transform", d => `translate(${x(xValue(d))}, ${y(yValue(d))})`)
            .attr("r", d => radius ? radius(sizeValue(d)) : 3)
            .on("mouseenter touchenter", function(d) {
              d3.select(this).attr("stroke", "black").raise();
            })
            .on("mouseout touchout", function(d) {
              d3.select(this).attr("stroke", "none");
            })
            .append('title')
              .text(d => hoverText(d));
      }
    }
  };

  function drawUnselectedDots() {
    if (g) {
      g.select(".unselectedDots").selectAll("*").remove();
      if (showUnselectedDots) {
        g.select(".unselectedDots")
          .selectAll("g")
          .data(unselected)
          .join("circle")
            .attr("class", "unselectedDot")
            .attr("fill", unselectedColor)
            .attr("fill-opacity", unselectedOpacity)
            .attr("transform", d => `translate(${x(xValue(d))}, ${y(yValue(d))})`)
            .attr("r", d => radius ? radius(sizeValue(d)) : 3)
            .on("mouseenter touchenter", function(d) {
              d3.select(this).attr("stroke", "black");
            })
            .on("mouseout touchout", function(d) {
              d3.select(this).attr("stroke", "none");
            })
            .append('title')
              .text(d => hoverText(d));
      }
    }
  };

  function fillCorrelationRect () {
    let x = [], y = [];
    selected.forEach(d => {x.push(xValue(d)); y.push(yValue(d))});
    if (x.length > 1) {
      correlationValue = ss.sampleCorrelation(x, y);
      // console.log(`corr: ${corr}`);
      // console.log(`covar: ${ss.sampleCovariance(x, y)}`)
      g.select(".corrRect")
        .attr("fill", correlationColorScale(correlationValue))
      
      g.select(".corrRect").select("title")
        .text(`'${xAxisTitle}' vs. '${yAxisTitle}'\nCorrelation (r) = ${correlationValue.toFixed(2)}`);
      g.select(".corrText")
        .text(`Correlation: r = ${correlationValue.toFixed(2)}`);
    } else {
      correlationValue = NaN;
      g.select(".corrRect")
        .attr("fill", "black");
      g.select(".corrRect").select("title")
        .text(`'${xAxisTitle}' vs. '${yAxisTitle}'\nCorrelation (r) = undefined (fewer than 2 samples selected)}`);
      g.select(".corrText")
        .text('Correlation: r = undefined (fewer than 2 samples)');
    }
  }

  // chart.setHighlightData = function(value) {
  //   if (!arguments.length) {
  //     return highlightData;
  //   }

  //   highlightData = value;
  //   svg.selectAll('.dot')
  //     .each(function(dot) {
  //       if (highlightData.includes(dot)) {
  //         d3.select(this)
  //           .attr("fill", useColorValue && colorValue ? colorValue(dot) : pointColor)
  //           // .attr("fill", pointColor)
  //           .attr("fill-opacity", 0.6)
  //           .raise();
  //       } else {
  //         d3.select(this)
  //           .attr("fill", notHighlightedColor)
  //           .attr('fill-opacity', 0.1);
  //       }
  //     });

  //   return chart;
  // };

  // chart.clearHighlightData = function() {
  //   highlightData = null;
  //   svg.selectAll(".dot")
  //     .attr("fill", d => useColorValue && colorValue ? colorValue(d) : pointColor)
  //     .attr("fill-opacity", null);

  //   return chart;
  // };

  // chart.useColorValue = function(value) {
  //   if (!arguments.length) {
  //     return useColorValue;
  //   }
  //   useColorValue = value;

  //   if (svg) {
  //     if (highlightData && highlightData !== null) {
  //       svg.selectAll('.dot')
  //         .each(function(dot) {
  //           if (highlightData.includes(dot)) {
  //             d3.select(this)
  //               .attr("fill", useColorValue && colorValue ? colorValue(dot) : pointColor)
  //               // .attr("fill", pointColor)
  //               .attr("fill-opacity", 0.6)
  //               .raise();
  //           } else {
  //             d3.select(this)
  //               .attr("fill", notHighlightedColor)
  //               .attr('fill-opacity', 0.1);
  //           }
  //       });
  //     } else {
  //       svg.selectAll(".dot")
  //         .attr("fill", d => useColorValue && colorValue ? colorValue(d) : pointColor)
  //         .attr("fill-opacity", null);
  //     }
  //   }

  //   return chart;
  // }

  chart.margin = function(value) {
    if (!arguments.length) {
      return margin;
    }
    margin = value;
    return chart;
  };

  chart.chartSize = function(value) {
    if (!arguments.length) {
      return chartSize;
    }

    chartSize = value;
    //TODO: resize chart without redrawing it
    // drawChart();
    return chart;
  }

  chart.xValue = function(value) {
    if (!arguments.length) {
      return xValue;
    }
    xValue = value;
    drawChart();
    return chart;
  };

  chart.yValue = function(value) {
    if (!arguments.length) {
      return yValue;
    }
    yValue = value;
    drawChart();
    return chart;
  };

  chart.sizeValue = function(value) {
    if (!arguments.length) {
      return sizeValue;
    }
    sizeValue = value;
    drawChart();
    return chart;
  }

  chart.yAxisTitle = function(value) {
    if (!arguments.length) {
      return yAxisTitle;
    }
    yAxisTitle = value;
    // TODO: update yAxisTitle text
    return chart;
  };

  chart.xAxisTitle = function(value) {
    if (!arguments.length) {
      return xAxisTitle;
    }
    xAxisTitle = value;
    //TODO: update xAxisTitle text
    return chart;
  };

  chart.selected = function(values) {
    if (!arguments.length) {
      return selected;
    }

    if (values) {
      selected = new Set(values.filter(v => _chartData.includes(v)));
      unselected.clear();
      _chartData.forEach(d => {
        if (!selected.has(d)) {
          unselected.add(d);
        }
      });
    }
    drawSelectedDots();
    drawUnselectedDots();
    drawRegressionLine();
    fillCorrelationRect();
    // drawStatusText();

    return chart;
  };

  chart.numNull = function() {
    return numNull;
  };

  chart.correlationValue = function() {
    return correlationValue;
  };

  chart.selectedColor = function(value) {
    if (!arguments.length) {
      return selectedColor;
    }
    selectedColor = value;
    if (g) {
      g.selectAll(".selectedDot")
        .attr("fill", selectedColor);
    }
    return chart;
  };

  chart.unselectedColor = function(value) {
    if (!arguments.length) {
      return unselectedColor;
    }
    unselectedColor = value;
    // TODO Update the chart
    if (g) {
      g.selectAll(".unselectedDot")
        .attr("fill", unselectedColor);
    }
    return chart;
  };

  chart.showRegressionLine = function(value) {
    if (!arguments.length) {
      return showRegressionLine;
    }
    showRegressionLine = value;
    drawRegressionLine();
    return chart;
  };
  
  chart.showUnselectedDots = function(value) {
    if (!arguments.length) {
      return showUnselectedDots;
    }
    showUnselectedDots = value;
    drawUnselectedDots();
    return chart;
  };

  chart.showSelectedDots = function(value) {
    if (!arguments.length) {
      return showSelectedDots;
    }
    showSelectedDots = value;
    drawSelectedDots();
    return chart;
  }

  chart.selectedOpacity = function(value) {
    if (!arguments.length) {
      return selectedOpacity;
    }
    selectedOpacity = value;
    if (g) {
      g.selectAll(".selectedDot")
        .attr("fill-opacity", selectedOpacity);
    }
    return chart;
  };

  chart.unselectedOpacity = function(value) {
    if (!arguments.length) {
      return unselectedOpacity;
    }
    unselectedOpacity = value;
    if (g) {
      g.selectAll(".unselectedDot")
        .attr("fill-opacity", unselectedOpacity);
    }
    return chart;
  };

  return chart;
}