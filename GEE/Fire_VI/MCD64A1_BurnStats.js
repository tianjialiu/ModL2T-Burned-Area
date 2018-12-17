/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var indiaShp = ee.FeatureCollection("projects/GlobalFires/IndiaAgFires/IND_adm1"),
    mcd64a1 = ee.ImageCollection("MODIS/006/MCD64A1");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// --------------------------------------
// Frequency of burn scars in NW India
// from MCD64A1
// --------------------------------------
// Author: Tianjia Liu
// Last updated: October 17, 2018

// Input Parameters:
var params = require('users/tl2581/ModL2T_BA:InputParams.js');

// Time Period
var sYear = params.sYear; // Start Year
var eYear = params.eYear; // End Year

// State Boundaries
var punjab = indiaShp.filterMetadata('STATE','equals','PUNJAB');
var haryana = indiaShp.filterMetadata('STATE','equals','HARYANA');
var states = haryana.merge(punjab).geometry();

var Shp = states;

// Pre-fire and post-fire Collection Dates
var inMonths = params.inMonths;
var inDays = params.inDays;

var modisScale = ee.Image(mcd64a1.first());

var mcd64a1YrMin = [];
var mcd64a1YrFreq = [];
for(var iYear = sYear; iYear <= eYear; iYear++) {
  // post-fire collection start and end dates
  var dateS_post = ee.Date.fromYMD(iYear, inMonths.get(2), inDays.get(2));
  var dateE_post = ee.Date.fromYMD(iYear, inMonths.get(3), inDays.get(3));

  var mcd64a1_PostM = mcd64a1.filterDate(dateS_post,dateE_post).select('BurnDate').min()
      .reproject({crs: modisScale.projection(), scale: modisScale.projection().nominalScale()});
  
  mcd64a1YrMin[iYear-sYear] = ee.Image(mcd64a1_PostM);
  mcd64a1YrFreq[iYear-sYear] = ee.Image(mcd64a1_PostM).gt(0);
}

var mcd64a1_freq = ee.ImageCollection(mcd64a1YrFreq).sum();
var mcd64a1_date = ee.ImageCollection(mcd64a1YrMin).median();

// Visualize Burned Area & Print Stats
Map.setCenter(75.8, 30.4, 7);

// Layers are by default off, click on layers to visualize
Map.addLayer(mcd64a1_date.updateMask(mcd64a1_date),
  {min: 273, max: 336, palette: ['#D3D3D3','#000000']},
  'MCD64A1 Burn Scar Median Date');
  
Map.addLayer(mcd64a1_freq.updateMask(mcd64a1_freq),
  {min: 1, max: 14, palette: ['#FFFFB2','#FED976','#FEB24C','#FD8D3C','#FC4E2A','#E31A1C','#B10026']},
  'MCD64A1 Burn Scar Freq');

// -------- Legend --------------
// Create the panel for the legend items.
var makeLegend = function(pos) {
  var legend = ui.Panel({
    style: {
      position: pos,
      padding: '8px 15px'
    }
  });
  return legend;
};

// Create and add the legend title.
var makeTitle = function(title) {
var legendTitle = ui.Label({
  value: title,
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 6px 0',
    padding: '0'
  }
});
return legendTitle;
};

var legend = makeLegend('bottom-left');
legend.add(makeTitle('Years Burned'));

var legend2 = makeLegend('bottom-right');
legend2.add(makeTitle('Burn Date'));

// Creates and styles 1 row of the legend.
var makeRow = function(color, name) {
  // Create the label that is actually the colored box.
  var colorBox = ui.Label({
    style: {
      backgroundColor: '#' + color,
      // Use padding to give the box height and width.
      padding: '8px',
      margin: '0 0 4px 0'
    }
  });

  // Create the label filled with the description text.
  var description = ui.Label({
    value: name,
    style: {margin: '0 0 4px 6px'}
  });

  return ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
};

// List of palette colors and class names
var getRows = function(palette,names,legend) {
  for (var i = 0; i < names.length; i++) {
    legend.add(makeRow(palette[i], names[i]));
  }
  return legend;
};

var legend = getRows(['FFFFB2', 'FED976', 'FEB24C', 'FD8D3C', 'FC4E2A', 'E31A1C', 'B10026'],
  ['1-2','3-4','5-6','7-8','9-10','11-12','13-14'],legend);
Map.add(legend);

var legend2 = getRows(['D3D3D3','FFFFFF','000000'],
  ['273-274 (Oct 1)','to','335-336 (Nov 30)'],legend2);
Map.add(legend2);