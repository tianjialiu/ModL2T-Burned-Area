/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var indiaShp = ee.FeatureCollection("projects/GlobalFires/IndiaAgFires/IND_adm1"),
    modisTerraSR = ee.ImageCollection("MODIS/006/MOD09A1"),
    mcd12q1 = ee.ImageCollection("MODIS/006/MCD12Q1");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// ---------------------------
// NBR and NDVI Time Series
// ---------------------------
// Author: Tianjia Liu
// Last updated: September 30, 2018

// Input Parameters:
var params = require('users/tl2581/ModL2T_BA:InputParams.js');

// Time Period
var sYear = params.sYear; // Start Year
var eYear = params.eYear; // End Year

// District Boundaries
var punjab = indiaShp.filterMetadata('STATE','equals','PUNJAB');
var haryana = indiaShp.filterMetadata('STATE','equals','HARYANA');
var states = haryana.merge(punjab);

var Shp = states.geometry();

// Global functions
var getQABits = params.getQABits;

// Simplify featureCollection with the year as a point
var getPtYr = function(feature) {
  return feature.setGeometry(ee.Geometry.Point(iYear,0));
};

var agMask = ee.Image(mcd12q1.select('LC_Type2')
  .map(function(image) {return image.eq(12)}).max());

// Calculate VIs
var calcVI = function(image) {
  var QA = image.select('StateQA');
  var clear = getQABits(QA, 0, 1, 'clear').expression("b(0) == 0");
  var cloudMask = image.normalizedDifference(['sur_refl_b07','sur_refl_b01']);
  
  var nbr = image.normalizedDifference(['sur_refl_b02','sur_refl_b07']).rename('NBR');
  var ndvi = image.normalizedDifference(['sur_refl_b02','sur_refl_b01']).rename('NDVI');
  var time = ee.Image.constant(image.date().millis().divide(1000*24*60*60)).rename('Time');
  var viMasked = nbr.addBands(ndvi).addBands(time)
    .updateMask(clear).updateMask(cloudMask.gt(0)).updateMask(agMask);
  return viMasked;
};

var modisScale = ee.Image(modisTerraSR.select('sur_refl_b02').first());
  
var VIcol = modisTerraSR.filter(ee.Filter.calendarRange(sYear, eYear, 'year'))
  .map(calcVI);
  
var getVIday = function(image) {
return image.reduceRegions({
    reducer: ee.Reducer.median().unweighted(),
    collection: Shp,
    crs: modisScale.projection(),
    scale: modisScale.projection().nominalScale(),
  }).toList(1,0).get(0);
};

Export.table.toDrive({
  collection: VIcol.map(getVIday),
  description: 'totalVI',
  selectors: ['system:index','NBR','NDVI','Time']
});