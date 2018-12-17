/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var indiaShp = ee.FeatureCollection("projects/GlobalFires/IndiaAgFires/IND_adm1"),
    modisTerraSR = ee.ImageCollection("MODIS/006/MOD09A1"),
    landsat7 = ee.ImageCollection("LANDSAT/LE07/C01/T1_SR"),
    landsat8 = ee.ImageCollection("LANDSAT/LC08/C01/T1_SR"),
    landsat5 = ee.ImageCollection("LANDSAT/LT05/C01/T1_SR");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// ------------------------------------------------------------
// MODIS and Landsat usable cloud-free pixels
// in the study region (NW India) and study period (2003-2016)
// ------------------------------------------------------------
// Author: Tianjia Liu
// Last updated: September 30, 2018

// Input Parameters:
var params = require('users/tl2581/ModL2T_BA:InputParams.js');

// Time Period
var sYear = params.sYear; // Start Year
var eYear = params.eYear; // End Year

// State Boundaries
var punjab = indiaShp.filterMetadata('STATE','equals','PUNJAB');
var haryana = indiaShp.filterMetadata('STATE','equals','HARYANA');
var states = haryana.merge(punjab);

var Shp = states;

// Pre-fire and post-fire Collection Dates
var inMonths = params.inMonths;
var inDays = params.inDays;

// Global functions
var getQABits = params.getQABits;
var calcNBR_modis = params.calcNBR_modis;
var calcNBR_l8 = params.calcNBR_l8;
var calcNBR_l5and7 = params.calcNBR_l5and7;

// Simplify featureCollection with the year as a point
var getPtYr = function(feature) {
  return feature.setGeometry(ee.Geometry.Point(iYear,0));
};

// Return valid NBR pixels
var getValidPix = function(image) {
  return image.gt(-1);
};

// ------------- START OF LOOP ---------------
var totalPix = [];
for(var iYear = sYear; iYear <= eYear; iYear++) {

  // pre-fire collection start and end dates
  var dateS_pre = ee.Date.fromYMD(iYear, inMonths.get(0), inDays.get(0));
  var dateE_pre = ee.Date.fromYMD(iYear, inMonths.get(1), inDays.get(1));
  
  // post-fire collection start and end dates
  var dateS_post = ee.Date.fromYMD(iYear, inMonths.get(2), inDays.get(2));
  var dateE_post = ee.Date.fromYMD(iYear, inMonths.get(3), inDays.get(3));

  var modisScale = ee.Image(modisTerraSR.select('sur_refl_b02').first());
  var landScale = ee.Image(landsat7.first());

  var modisCol_pre = modisTerraSR.filterDate(dateS_pre,dateE_pre);
  var modisCol_post = modisTerraSR.filterDate(dateS_post,dateE_post);

  var modis_NBRpre = ee.ImageCollection(modisCol_pre.map(calcNBR_modis)).map(getValidPix).sum();
  var modis_NBRpost = ee.ImageCollection(modisCol_post.map(calcNBR_modis)).map(getValidPix).sum();

  // Landsat Collections
  if (iYear >= 2013) {
    var l8Col_pre = landsat8.filterDate(dateS_pre,dateE_pre);
    var l8Col_post = landsat8.filterDate(dateS_post,dateE_post);

    var l8_NBRpre = l8Col_pre.map(calcNBR_l8).map(getValidPix).sum();
    var l8_NBRpost = l8Col_post.map(calcNBR_l8).map(getValidPix).sum();
  }

  var l7Col_pre = landsat7.filterDate(dateS_pre,dateE_pre);
  var l7Col_post = landsat7.filterDate(dateS_post,dateE_post);

  var l7_NBRpre = l7Col_pre.map(calcNBR_l5and7).map(getValidPix).sum();
  var l7_NBRpost = l7Col_post.map(calcNBR_l5and7).map(getValidPix).sum();

  if (iYear <= 2010) {
    var l5Col_pre = landsat5.filterDate(dateS_pre,dateE_pre);
    var l5Col_post = landsat5.filterDate(dateS_post,dateE_post);

    var l5_NBRpre = l5Col_pre.map(calcNBR_l5and7).map(getValidPix).sum();
    var l5_NBRpost = l5Col_post.map(calcNBR_l5and7).map(getValidPix).sum();
  }

  if (iYear >= 2013) {
    var landsat_NBRpre = ee.ImageCollection([l7_NBRpre,l8_NBRpre]).sum();
    var landsat_NBRpost = ee.ImageCollection([l7_NBRpost,l8_NBRpost]).sum();
  }
  if (iYear <= 2010) {
    var landsat_NBRpre = ee.ImageCollection([l7_NBRpre,l5_NBRpre]).sum();
    var landsat_NBRpost = ee.ImageCollection([l7_NBRpost,l5_NBRpost]).sum();
  }
  if (iYear > 2010 & iYear < 2013) {
    var landsat_NBRpre = l7_NBRpre;
    var landsat_NBRpost = l7_NBRpost;
  }

  var pix = modis_NBRpre.rename('MODIS_pre')
    .addBands(modis_NBRpost.rename('MODIS_post'))
    .addBands(landsat_NBRpre.rename('Landsat_pre'))
    .addBands(landsat_NBRpost.rename('Landsat_post'))
    .reduceRegions({
      collection: Shp.geometry(),
      reducer: ee.Reducer.mean().unweighted(),
      crs: modisScale.projection(),
      scale: modisScale.projection().nominalScale()
    }).toList(500,0);

  var totalPix = ee.FeatureCollection(totalPix)
  .merge(ee.FeatureCollection(pix).map(getPtYr));
}

print(totalPix);

// Run tasks, takes 1 min to finish
Export.table.toDrive({
  collection: totalPix,
  description: 'totalPix',
  selectors: ['MODIS_pre','MODIS_post','Landsat_pre','Landsat_post','.geo']
});