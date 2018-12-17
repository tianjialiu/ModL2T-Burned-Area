/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var indiaShp = ee.FeatureCollection("projects/GlobalFires/IndiaAgFires/IND_adm1"),
    modisNBR = ee.ImageCollection("projects/GlobalFires/IndiaAgFires/modisNBR"),
    landsatNBR = ee.ImageCollection("projects/GlobalFires/IndiaAgFires/landsatNBR"),
    glc30 = ee.Image("projects/GlobalFires/IndiaAgFires/glc30");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// ---------------------------------------------
// Download MODIS-Landsat pre and post-fire NBR
// regionally averaged differences
// ---------------------------------------------
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

// Function to simplify featureCollection with the year as a point
var getPtYr = function(feature) {
  return feature.setGeometry(ee.Geometry.Point(iYear,0));
};

var modisScale = ee.Image(modisNBR.first());
var landScale = ee.Image(landsatNBR.first());
var glc30Re = glc30.reproject({crs: landScale.projection(), scale: landScale.projection().nominalScale()});

// ------------- START OF LOOP ---------------
var nbrDiff = [];
for(var iYear = sYear; iYear <= eYear; iYear++) {
  
  var modisNBRyr = modisNBR.filter(ee.Filter.calendarRange(iYear,iYear,'year')).first();
  var modis_NBRpre = modisNBRyr.select('preFire');
  var modis_NBRpost = modisNBRyr.select('postFire');

  var landsatNBRyr = landsatNBR.filter(ee.Filter.calendarRange(iYear,iYear,'year')).first();
  var landsat_NBRpre = landsatNBRyr.select('preFire');
  var landsat_NBRpost = landsatNBRyr.select('postFire');

  var pre_diff = modis_NBRpre.subtract(landsat_NBRpre).updateMask(glc30Re.eq(10));
  var post_diff = modis_NBRpost.subtract(landsat_NBRpost).updateMask(glc30Re.eq(10));

  var pre_regionDiff = pre_diff.reduceRegion({
    geometry: Shp.geometry(),
    reducer: ee.Reducer.mean(),
    crs: modisScale.projection(),
    scale: modisScale.projection().nominalScale(),
    maxPixels: 1e12
  }).toArray().multiply(1000).round().divide(1000).toList().get(0);

  var post_regionDiff = post_diff.reduceRegion({
    geometry: Shp.geometry(),
    reducer: ee.Reducer.mean(),
    crs: modisScale.projection(),
    scale: modisScale.projection().nominalScale(),
    maxPixels: 1e12
  }).toArray().multiply(1000).round().divide(1000).toList().get(0);

  var nbrDiffYr = pre_diff.rename('preDiff')
  .addBands(post_diff.rename('postDiff')).reduceRegions({
    collection: Shp.geometry(),
    reducer: ee.Reducer.mean(),
    crs: modisScale.projection(),
    scale: modisScale.projection().nominalScale(),
  }).toList(500,0);
  
  var nbrDiff = ee.FeatureCollection(nbrDiff)
    .merge(ee.FeatureCollection(nbrDiffYr).map(getPtYr));
  
  print(iYear.toString() + ' preCol & postCol diff:');
  print(pre_regionDiff);
  print(post_regionDiff);
}

// Run tasks
Export.table.toDrive({
  collection: nbrDiff,
  description: 'nbrDiff',
  selectors: ['preDiff','postDiff','.geo']
});