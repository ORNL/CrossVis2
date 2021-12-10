var mapChart = function () {
  let margin = {top: 20, right: 20, bottom: 20, left: 20};
  let width = 1000;
  let height = 620;
  let svg;
  let mapG;
  let selected;
  let clicked;
  let _chartData;
  let _chartDiv;
  let _basemapGeometries;
  let _featureShapes;
  let dataValue;
  let idValue;
  let nameValue;
  let featureDisplayMode = "area"; /* point or area */
  let clickedStrokeColor = "#000";
  let noDataColor = "#fff";
  let notSelectedColor = "#eee";
  let pointColor = d3.schemeBlues[9][7];
  let colorScale;
  let colorScheme;
  let radiusScale;
  let valueFormat = d3.format(',d');
  let showNoDataItems = true;
  let colorScaleMode = "quantile"; /* quantile or linear */
  let featureHoverHandler;
  let featureClickHandler;
  
  function chart(selection, data, basemapGeometries, featureShapes, selectedData = null) {
    _chartData = new Map(data.map(d => [idValue(d), d]));
    _chartDiv = selection;
    _basemapGeometries = basemapGeometries;
    _featureShapes = featureShapes;
    clicked = new Set();

    if (selectedData !== null) {
      selected = new Set(selectedData.filter(d => _chartData.has(idValue(d))).map(idValue));
    } else {
      selected = new Set(_chartData.keys());
    }

    drawChart();
  };

  function drawChart() {
    if (_chartDiv) {
      _chartDiv.selectAll("*").remove();

      if (_chartData) {
        svg = _chartDiv.append('svg')
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom);

        mapG = svg.append('g')
          .attr('class', 'mapcontainer')
          .attr('stroke-linejoin', 'round')
          .attr('stroke-linecap', 'round')
          .attr('transform', `translate(${margin.left}, ${margin.right})`);

        const projection = d3.geoAlbersUsa()
          .fitSize([width, height], _featureShapes);
        // const projection = d3.geoAlbersUsa()
        //   .fitSize([width, height], _basemapGeometries.usShape);
        const path = d3.geoPath().projection(projection);

        if (!colorScale) {
          createColorScale();
        }

        if (featureDisplayMode === "point") {
          if (!radiusScale) {
            createRadiusScale();
          }          

          mapG.append("path")
            .attr("fill", "none")
            .attr("stroke", "#bbb")
            .attr("stroke-width", 0.5)
            .attr("d", path(_basemapGeometries.statesMesh)); 

          mapG.append("path")
            .attr("fill", "none")
            .attr("stroke", "#aaa")
            .attr("stroke-width", 0.5)
            .attr("d", path(_basemapGeometries.usShape));

          mapG.append("g")
              .attr("fill-opacity", 0.5)
              .attr("stroke", "#fff")
              .attr("stroke-width", 0.5)
            .selectAll("circle")
            .data(_featureShapes.features
                .filter(d => _chartData.has(d.id))
                .sort((a,b) => d3.descending(dataValue(_chartData.get(a.id), dataValue(_chartData.get(b.id))))))
            .join("circle")
              .attr("class", "feature")
              .attr("fill", pointColor)
              .attr('transform', d => `translate(${path.centroid(d)})`)
              .attr('r', 1)
              .append("title")
                .text(d => hoverText(_chartData.get(d.id)));
                // .text(d => d.id);
        } else if (featureDisplayMode === "area") {
          mapG.selectAll("path")
            .data(_featureShapes.features.filter(d => _chartData.has(d.id)))
            .join("path")
              .attr("class", "feature")
              .attr("stroke", "#ddd")
              .attr("stroke-width", 0.5)
              .attr("fill", noDataColor)
              .attr("d", path)
              .append("title")
                .text(d => hoverText(_chartData.get(d.id)));
                // .text(d => d.id);

          mapG.append("path")
            .attr("fill", "none")
            .attr("stroke", "#bbb")
            .attr("stroke-width", 0.5)
            .attr("d", path(_basemapGeometries.statesMesh)); 

          mapG.append("path")
            .attr("fill", "none")
            .attr("stroke", "#aaa")
            .attr("stroke-width", 0.5)
            .attr("d", path(_basemapGeometries.usShape));
        }

        updateFeatureEncodings();
        updateFeatureVisibility();
        
        function zoomed (event, d) {
          mapG.style('stroke-width', `${0.5 / event.transform.k}px`);
          mapG.attr("transform", event.transform);
        };

        const zoom = d3.zoom()
          .scaleExtent([1,10])
          .on('zoom', zoomed);
        
        svg.call(zoom);
        
        // console.log(_features.features.filter(d => _chartData.has(d.id)).length);
        // console.log(_features.features.length);
        // console.log(_features.features.filter(d => _chartData.has(d.id)).map(d => d.geometry).filter(d => d.type === "MultiPolygon"));

        // prints the locations that are outside the US, Alaska, Hawaii
        // _featureShapes.features.filter(d => _chartData.has(d.id)).forEach(d => {
        //   const centroid = path.centroid(d);
        //   if (isNaN(centroid[0])) {
        //     console.log(d);
        //     console.log(centroid);
        //   }
        // });
      }
    }
  };

  const getColors = () => {
    if (colorScaleMode === "quantile" || colorScaleMode === "quantize") {
      if (colorScheme === 'OrRd') {
        return d3.schemeOrRd[9].slice(1,9)
      } else if (colorScheme === 'YlGn') {
        return d3.schemeYlGn[9].slice(1,9)
      } else if (colorScheme === 'YlGnBu') {
        return d3.schemeYlGnBu[9].slice(1,9)
      } else if (colorScheme === 'YlOrBr') {
        return d3.schemeYlOrBr[9].slice(1,9)
      }  else if (colorScheme === 'greens') {
        return d3.schemeGreens[9].slice(1,9)
      } else if (colorScheme === 'blues') {
        return d3.schemeBlues[9].slice(1,9)
      }  else if (colorScheme === 'greys') {
        return d3.schemeGreys[9].slice(1,9)
      } else {
        return d3.schemeGreys[9].slice(1,9)
      }
    } else {
      if (colorScheme === 'OrRd') {
        return t => d3.interpolateOrRd((t * .75 + 0.15));
      } else if (colorScheme === 'YlGn') {
        return t => d3.interpolateYlGn((t * .75 + 0.15));
      } else if (colorScheme === 'YlGnBu') {
        return t => d3.interpolateYlGnBu((t * .75 + 0.15));
      } else if (colorScheme === 'YlOrBr') {
        return t => d3.interpolateYlOrBr((t * .75 + 0.15));
      } else if (colorScheme === 'greens') {
        return t => d3.interpolateGreens((t * .75 + 0.15));
      } else if (colorScheme === 'blues') {
        return t => d3.interpolateBlues((t * .75 + 0.15));
      } else if (colorScheme === 'greys') {
        return t => d3.interpolateGreys((t * .75 + 0.15));
      } else {
        return t => d3.interpolateGreys((t * .75 + 0.15));
      }
    }
  };

  const createColorScale = () => {
    colorScale = null;
    if (_chartData) {
      if (colorScaleMode === "quantize") {
        colorScale = d3.scaleQuantize(d3.extent([..._chartData.values()].map(d => dataValue(d))), getColors()).nice();
        // colorScale = d3.scaleQuantile([..._chartData.values()].map(d => dataValue(d)), getColors());
        // colorScale = d3.scaleQuantile([..._chartData.values()].map(d => dataValue(d)), d3.schemeBlues[9].slice(1,9));
      } else if (colorScaleMode === "quantile") {
        colorScale = d3.scaleQuantile([..._chartData.values()].map(d => dataValue(d)), getColors());
      } else if (colorScaleMode === "linear") {
        colorScale = d3.scaleSequential(d3.extent([..._chartData.values()].map(d => dataValue(d))), getColors()).nice();
        // colorScale = d3.scaleSequential(d3.extent([..._chartData.values()].map(d => dataValue(d))), t => d3.interpolateBlues((t * .75 + 0.15)));
      }
    }
    if (colorScale) {
      const colorRange = colorScale.range();
      pointColor = colorRange[colorRange.length - 1];
    } else {
      pointColor = "#444";
    }
  };

  const createRadiusScale = () => {
    radiusScale = null;
    if (_chartData) {
      const maxRadius = width * .02;
      radiusScale = d3.scaleSqrt([0, d3.max([..._chartData.values()], d => dataValue(d))], [1.5, maxRadius]);
    }
  };

  const updateFeatureVisibility = () => {
    if (mapG) {
      mapG.selectAll(".feature")
        .attr("display", d => showNoDataItems ? null : _chartData.has(d.id) ? null : "none");
    }
  };

  const hoverText = (hoverData) => {
    return `${nameValue(hoverData)} (${idValue(hoverData)}):\n${valueFormat(dataValue(hoverData))}`;
    // code below will show all properties for the hoverData
    /*
    var text = '';
    let entries = Object.entries(hoverData);
    for (let i = 0; i < entries.length; i++) {
      text += `${entries[i][0]}: ${entries[i][1]}`;
      if (i + 1 < entries.length) {
        text += '\n';
      }
    }
    return text;
    */
  };

  const updateFeatureEncodings = () => {
    if (mapG) {
      if (featureDisplayMode === "point") {
        mapG.selectAll(".feature")
          .transition()
            .attr("stroke", d => clicked.has(d.id) ? clickedStrokeColor : null)
            .attr("stroke-width", d => clicked.has(d.id) ? 2 : null)
            .attr("r", d => getRadius(_chartData.get(d.id)))
            .attr("display", d => selected.has(idValue(_chartData.get(d.id))) ? null : "none");
            
        mapG.selectAll(".feature")
          .on("mouseenter", (event, d) => featureHoverHandler ? featureHoverHandler(d.id, "entered") : null)
          .on("mouseleave", (event, d) => featureHoverHandler ? featureHoverHandler(d.id, "left") : null)
          .on("click", (event, d) => {
            if (featureClickHandler) {
              if (clicked.has(d.id)) {
                clicked.delete(d.id);
                d3.select(event.target)
                  .attr("stroke", null)
                  .attr("stroke-width", null);
                featureClickHandler(d.id, "unclicked");
              } else {
                clicked.add(d.id);
                d3.select(event.target)
                  .attr("stroke", clickedStrokeColor)
                  .attr("stroke-width", 2);
                featureClickHandler(d.id, "clicked");
              }
            }
          })
          // .on("click", (event, d) => featureClickHandler ? featureClickHandler(d.id) : null)
          .select("title")
            .text(d => hoverText(_chartData.get(d.id)));
      } else if (featureDisplayMode === "area") {
        mapG.selectAll(".feature")
          .transition()
            .attr("stroke", d => clicked.has(d.id) ? clickedStrokeColor : "#ddd")
            .attr("stroke-width", d => clicked.has(d.id) ? 2.0 : 0.5)
            .attr("fill", d => getColor(_chartData.get(d.id)));

        mapG.selectAll(".feature")
          .on("mouseenter", (event, d) => featureHoverHandler ? featureHoverHandler(d.id, "entered") : null)
          .on("mouseleave", (event, d) => featureHoverHandler ? featureHoverHandler(d.id, "left") : null)
          .on("click", (event, d) => {
            if (featureClickHandler) {
              if (clicked.has(d.id)) {
                clicked.delete(d.id);
                d3.select(event.target)
                  .attr("stroke", "#ddd")
                  .attr("stroke-width", .5)
                  .lower();
                featureClickHandler(d.id, "unclicked");
              } else {
                clicked.add(d.id);
                d3.select(event.target)
                  .attr("stroke", clickedStrokeColor)
                  .attr("stroke-width", 2)
                  .raise();
                featureClickHandler(d.id, "clicked");
              }
            }
          })
          .select("title")
            .text(d => hoverText(_chartData.get(d.id)));
          // .select("title")
          //   .text(d => `${nameValue(_chartData.get(d.id))} = ${valueFormat(dataValue(_chartData.get(d.id)))}`);
      }
    }
  };

  const getRadius = (datum) => {
    if (datum) {
        return radiusScale(dataValue(datum));
    } else {
      return 1;
    }
  };

  const getColor = (datum) => {
    if (datum) {
      if (selected.has(idValue(datum))) {
        if (!isNaN(dataValue(datum)) && dataValue(datum) !== null) {
          return colorScale(dataValue(datum));
        } else {
          return noDataColor;
        }
      } else {
        return notSelectedColor;
      }
    } else {
      return noDataColor;
    }
  };

  chart.clearClickedFeatures = function() {
    clicked.clear();
    updateFeatureEncodings();
  };

  chart.replaceData = function(newData, newDataValue) {
    _chartData = new Map(newData.map(d => [idValue(d), d]));
    dataValue = newDataValue;
    createColorScale();
    createRadiusScale();
    updateFeatureEncodings();
  }

  chart.showNoDataItems = function(value) {
    if (!arguments.length) {
      return showNoDataItems;
    }
    showNoDataItems = value;
    updateFeatureVisibility();
    return chart;
  };

  chart.colorScale = function(value) {
    return colorScale;
  };

  chart.radiusScale = function(value) {
    return radiusScale;
  };

  chart.colorScaleMode = function(value) {
    if (!arguments.length) {
      return colorScaleMode;
    }
    if (value !== colorScaleMode && (value === 'quantile' || value === 'quantize' || value === 'linear')) {
      colorScaleMode = value;
      colorScale = createColorScale();
      drawChart();
    }
    return chart;
  };

  chart.colorScheme = function(value) {
    if (!arguments.length) {
      return colorScheme;
    }
    if (value !== colorScheme) {
      colorScheme = value;
      colorScale = createColorScale();
      drawChart();  
    }
    return chart;
  };

  chart.featureDisplayMode = function(value) {
    if (!arguments.length) {
      return featureDisplayMode;
    }
    if (value !== featureDisplayMode && (value === 'point' || value === 'area')) {
      featureDisplayMode = value;
      drawChart();
    }
    return chart;
  };

  chart.valueFormat = function(value) {
    if (!arguments.length) {
      return valueFormat;
    }
    valueFormat = value;
    // drawChart();
    updateFeatureEncodings();
    return chart;
  };

  chart.selected = function(values) {
    if (!arguments.length) {
      return selected;
    }
    if (_chartData) {
      selected = new Set(values.filter(v => _chartData.has(idValue(v))).map(idValue));
    }
    updateFeatureEncodings();
    return chart;
  };

  chart.idValue = function(value) {
    if (!arguments.length) {
      return idValue;
    }
    idValue = value;
    drawChart();
    return chart;
  };

  chart.nameValue = function(value) {
    if (!arguments.length) {
      return nameValue;
    }
    nameValue = value;
    drawChart();
    return chart;
  };

  chart.dataValue = function(value) {
    if (!arguments.length) {
      return dataValue;
    }
    dataValue = value;
    createColorScale();
    createRadiusScale();
    updateFeatureEncodings();
    return chart;
  };

  chart.width = function(value) {
    if (!arguments.length) {
      return width;
    }
    width = value - margin.left - margin.right;
    drawChart();
    return chart;
  };

  chart.height = function(value) {
    if (!arguments.length) {
      return height;
    }
    height = value - margin.top - margin.bottom;
    drawChart();
    return chart;
  };

  chart.featureHoverHandler = function(value) {
    if (!arguments.length) {
      return featureHoverHandler;
    }
    featureHoverHandler = value;
    updateFeatureEncodings();
    return chart;
  };

  chart.featureClickHandler = function(value) {
    if (!arguments.length) {
      return featureClickHandler;
    }
    featureClickHandler = value;
    updateFeatureEncodings();
    return chart;
  };

  chart.margin = function(value) {
    if (!arguments.length) {
      return margin;
    }
    oldChartWidth = width + margin.left + margin.right;
    oldChartHeight = height + margin.top + margin.bottom;
    margin = value;
    width = oldChartWidth - margin.left - margin.right;
    height = oldChartHeight - margin.top - margin.bottom;
    drawChart();
    return chart;
  };

  chart.pointColor = function(value) {
    if (!arguments.length) {
      return pointColor;
    }
    pointColor = value;
    drawChart();
    return chart;
  };

  return chart;
}