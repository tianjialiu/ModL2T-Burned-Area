/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var modisTerraSR = ee.ImageCollection("MODIS/006/MOD09A1"),
    landsat7 = ee.ImageCollection("LANDSAT/LE07/C01/T1_SR"),
    landsat8 = ee.ImageCollection("LANDSAT/LC08/C01/T1_SR"),
    landsat5 = ee.ImageCollection("LANDSAT/LT05/C01/T1_SR");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// --------------------------------------------------------------------
// MODIS + Landsat Two-Tailed Normalized Burn Ratio (ModL2T NBR)
// burned area estimation in Punjab and Haryana, India
// for the post-monsoon burning season from October to November
// Datasets: MODIS\Terra C6 MOD09A1 (8-day composite) & Landsat 5,7,8
// --------------------------------------------------------------------
// Author: Tianjia Liu
// Last updated: October 1, 2018

// Input Parameters:
var params = require('users/tl2581/ModL2T_BA:InputParams.js');
var assetFolder = 'projects/GlobalFires/IndiaAgFires/';
var outputRegion = ee.Geometry.Rectangle([73.7,27.5,77.7,32.7],'EPSG:4326',false);

// Time Period
var sYear = params.sYear; // Start Year
var eYear = params.eYear; // End Year

var export_landsat = true;
var export_modis = true;

// Pre-fire and post-fire Collection Dates
var inMonths = params.inMonths;
var inDays = params.inDays;

// Global functions
var getQABits = params.getQABits;
var calcNBR_modis = params.calcNBR_modis;
var calcNBR_l8 = params.calcNBR_l8;
var calcNBR_l5and7 = params.calcNBR_l5and7;

// ------------- START OF LOOP ---------------
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

  var modis_NBRpre = ee.ImageCollection(modisCol_pre.map(calcNBR_modis)).max();
  var modis_NBRpost = ee.ImageCollection(modisCol_post.map(calcNBR_modis)).min();

  // Landsat Collections
  if (iYear >= 2013) {
    var l8Col_pre = landsat8.filterDate(dateS_pre,dateE_pre);
    var l8Col_post = landsat8.filterDate(dateS_post,dateE_post);

    var l8_NBRpre = l8Col_pre.map(calcNBR_l8).max();
    var l8_NBRpost = l8Col_post.map(calcNBR_l8).min();
  }

  var l7Col_pre = landsat7.filterDate(dateS_pre,dateE_pre);
  var l7Col_post = landsat7.filterDate(dateS_post,dateE_post);

  var l7_NBRpre = l7Col_pre.map(calcNBR_l5and7).max();
  var l7_NBRpost = l7Col_post.map(calcNBR_l5and7).min();

  if (iYear <= 2010) {
    var l5Col_pre = landsat5.filterDate(dateS_pre,dateE_pre);
    var l5Col_post = landsat5.filterDate(dateS_post,dateE_post);

    var l5_NBRpre = l5Col_pre.map(calcNBR_l5and7).max();
    var l5_NBRpost = l5Col_post.map(calcNBR_l5and7).min();
  }
  
  if (iYear >= 2013) {
    var landsat_NBRpre = ee.ImageCollection([l7_NBRpre,l8_NBRpre]).max();
    var landsat_NBRpost = ee.ImageCollection([l7_NBRpost,l8_NBRpost]).min();
  }
  if (iYear <= 2010) {
    var landsat_NBRpre = ee.ImageCollection([l7_NBRpre,l5_NBRpre]).max();
    var landsat_NBRpost = ee.ImageCollection([l7_NBRpost,l5_NBRpost]).min();
  }
  if (iYear > 2010 & iYear < 2013) {
    var landsat_NBRpre = l7_NBRpre;
    var landsat_NBRpost = l7_NBRpost;
  }

  var landsatMaxRe = landsat_NBRpre
    .reproject({crs: modisScale.projection(), scale: landScale.projection().nominalScale()})
    .reduceResolution({
      reducer: ee.Reducer.mean(),
      maxPixels: 1024
    }).reproject({crs: modisScale.projection()});

  var landsatMinRe = landsat_NBRpost
    .reproject({crs: modisScale.projection(), scale: landScale.projection().nominalScale()})
    .reduceResolution({
      reducer: ee.Reducer.mean(),
      maxPixels: 1024
    }).reproject({crs: modisScale.projection()});

  var landsatMask = modis_NBRpost.subtract(landsatMinRe).abs().lt(0.1)
    .updateMask(modis_NBRpre.subtract(landsatMaxRe).abs().lt(0.1))
    .gt(0).unmask(0);
  
  // Prepare bands for export
  var landsatNBRyr = landsat_NBRpre.addBands(landsat_NBRpost).rename(['preFire','postFire'])
    .set('system:time_start',ee.Date.fromYMD(iYear,10,1).millis());

  var modisNBRyr = modis_NBRpre.addBands(modis_NBRpost).rename(['preFire','postFire'])
    .set('system:time_start',ee.Date.fromYMD(iYear,10,1).millis());

  // Export NBR
  if (export_landsat === true) {
    Export.image.toAsset({
      image: landsatNBRyr,
      assetId: assetFolder + 'landsatNBR/landsatNBR_' + iYear,
      description: 'landsatNBR_' + iYear,
      region: outputRegion,
      crs: 'EPSG:4326',
      scale: 30,
      maxPixels: 1e13
    });
  }
  
  if (export_modis === true) {
    Export.image.toAsset({
      image: modisNBRyr,
      assetId: assetFolder + 'modisNBR/modisNBR_' + iYear,
      description: 'modisNBR_' + iYear,
      region: outputRegion,
      crs: 'SR-ORG:6974',
      crsTransform: [463.312716528,0,-20015109.354,0,-463.312716527,10007554.677],
      maxPixels: 1e13
    });
  }
}
