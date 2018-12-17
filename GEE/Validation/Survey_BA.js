/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var modl2t = ee.ImageCollection("projects/GlobalFires/IndiaAgFires/ModL2T_BA"),
    mcd64a1 = ee.ImageCollection("MODIS/006/MCD64A1"),
    mcd12q1 = ee.ImageCollection("MODIS/006/MCD12Q1"),
    glc30 = ee.Image("projects/GlobalFires/IndiaAgFires/glc30"),
    surveyVil = ee.FeatureCollection("projects/GlobalFires/IndiaAgFires/surveyVillages");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// -------------------------------------------
// Validation of burned area using household
// survey data from 2016
// -------------------------------------------
// Author: Tianjia Liu
// Last updated: October 2, 2018

// Input Parameters:
var params = require('users/tl2581/ModL2T_BA:InputParams.js');

// Time Period
var iYear = 2016;

var modisScale = ee.Image(mcd12q1.first());

var getCentroid = function(feature) {
  return ee.Feature(feature).centroid();
};

// ------------- START OF LOOP ---------------
var filterYr = ee.Filter.calendarRange(iYear,iYear,'year');
var filterMon = ee.Filter.calendarRange(10,11,'month');
  
// ModL2T BA
var modl2tYr = ee.Image(modl2t.filter(filterYr).first()).gt(1).selfMask();

// MCD12Q1 C6 agricultural mask
var mcd12q1Yr = ee.Image(mcd12q1.filter(filterYr).first())
  .select('LC_Type2').eq(12);

// MCD64A1 C6 Burned Area
var mcd64a1Yr = ee.Image(mcd64a1.filter(filterYr).filter(filterMon).select('BurnDate').max())
  .gt(0).selfMask().multiply(mcd12q1Yr)
  .reproject({crs: modisScale.projection(), scale: modisScale.projection().nominalScale()});
  
var modl2tYr_valid = modl2tYr.rename('ModL2T')
  .addBands(glc30.eq(10).selfMask().rename('AgMask'))
  .multiply(ee.Image.pixelArea()).multiply(1/1000/1000)
  .reduceRegions({
    collection: surveyVil,
    reducer: ee.Reducer.sum().unweighted(),
    crs: 'EPSG:4326',
    scale: 30
  }).map(getCentroid);

var mcd64a1Yr_valid = mcd64a1Yr.rename('MCD64A1')
  .addBands(mcd12q1Yr.selfMask().rename('AgMask'))
  .multiply(ee.Image.pixelArea()).multiply(1/1000/1000)
  .reduceRegions({
    collection: surveyVil,
    reducer: ee.Reducer.sum().unweighted(),
    crs: modisScale.projection(),
    scale: modisScale.projection().nominalScale()
  }).map(getCentroid);

Export.table.toDrive({
  collection: modl2tYr_valid,
  description: 'ModL2T_Valid',
  selectors: ['VillageID','Name','DT_NM','ST_NM',
    'ModL2T','AgMask']
});

Export.table.toDrive({
  collection: mcd64a1Yr_valid,
  description: 'MCD64A1_Valid',
  selectors: ['VillageID','Name','DT_NM','ST_NM',
    'MCD64A1','AgMask']
});
