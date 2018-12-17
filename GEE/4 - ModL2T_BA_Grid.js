/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var indiaShp = ee.FeatureCollection("projects/GlobalFires/IndiaAgFires/IND_adm1"),
    indiaGrid = ee.FeatureCollection("projects/GlobalFires/IndiaAgFires/NWIndia_grid2"),
    mcd64a1 = ee.ImageCollection("MODIS/006/MCD64A1"),
    mcd12q1 = ee.ImageCollection("MODIS/006/MCD12Q1"),
    modl2t = ee.ImageCollection("projects/GlobalFires/IndiaAgFires/ModL2T_BA");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// --------------------------------------------------------------------
// MODIS + Landsat Two-Tailed Normalized Burn Ratio (ModL2T NBR)
// burned area estimation in Punjab and Haryana, India
// for the post-monsoon burning season from October to November,
// gridded to the 0.25deg GFEDv4s grid
// Datasets: MODIS\Terra C6 MOD09A1 (8-day composite) & Landsat 5,7,8
// --------------------------------------------------------------------
// Author: Tianjia Liu
// Last updated: October 17, 2018

// Input Parameters:
var params = require('users/tl2581/ModL2T_BA:InputParams.js');

// Time Period
var sYear = params.sYear; // Start Year
var eYear = params.eYear; // End Year

// District Boundaries
var punjab = indiaShp.filterMetadata('STATE','equals','PUNJAB');
var haryana = indiaShp.filterMetadata('STATE','equals','HARYANA');
var region = haryana.merge(punjab);

var Shp = indiaGrid;

// Pre-fire and post-fire Collection Dates
var inMonths = params.inMonths;
var inDays = params.inDays;

// Simplify featureCollection with the year as a point
var getPtYr = function(feature) {
  return feature.setGeometry(ee.Geometry.Point(iYear,0));
};

var joinBA = function(feature) {
  var subBA = ee.Feature(ee.Join.simple().apply(mcd64a1BAyr,feature,joinFilter).first())
    .select(['sum'],['MCD64A1']);
  return feature.copyProperties(subBA,['MCD64A1']);
};

var joinFilter = ee.Filter.equals({
  leftField: 'layer',
  rightField: 'layer'
});

var modisScale = ee.Image(mcd64a1.first());
var landScale = ee.Image(modl2t.first());

// ------------- START OF LOOP ---------------
for(var iYear = sYear; iYear <= eYear; iYear++) {

  // post-fire collection start and end dates
  var dateS_post = ee.Date.fromYMD(iYear, inMonths.get(2), inDays.get(2));
  var dateE_post = ee.Date.fromYMD(iYear, inMonths.get(3), inDays.get(3));

  // MCD12Q1 C6 agricultural mask
  var mcd12q1Yr = ee.Image(mcd12q1.filter(ee.Filter.calendarRange(iYear,iYear,'year')).first())
    .select('LC_Type2').eq(12);

  // MCD64A1 C6 Burned Area
  var mcd64a1Yr = ee.Image(mcd64a1.filterDate(dateS_post,dateE_post).select('BurnDate').max())
    .gt(0).reproject({crs: modisScale.projection(), scale: modisScale.projection().nominalScale()});
  
  // ModL2T Burned Area
  var modl2tYr = ee.Image(modl2t.filterDate(dateS_post,dateE_post).first()).gt(1)
    .reproject({crs: landScale.projection(), scale: landScale.projection().nominalScale()});

  var modl2tBAyr = modl2tYr.addBands(modl2tYr.unmask(1))
    .selfMask().multiply(ee.Image.pixelArea()).multiply(1/1000/1000)
    .rename(['ModL2T','TotalPix']).clip(region).reduceRegions({
      collection: Shp,
      reducer: ee.Reducer.sum(),
      crs: landScale.projection(),
      scale: landScale.projection().nominalScale()
    });
  
  var mcd64a1BAyr = mcd64a1Yr.clip(region).updateMask(mcd12q1Yr).selfMask()
    .multiply(ee.Image.pixelArea()).multiply(1/1000/1000)
    .reduceRegions({
      collection: Shp,
      reducer: ee.Reducer.sum(),
      crs: modisScale.projection(),
      scale: modisScale.projection().nominalScale()
    });
  
  var combinedBAyr = modl2tBAyr.map(joinBA).sort('layer');

  // Run task, can take a couple minutes to finish
  Export.table.toDrive({
    collection: combinedBAyr,
    description: 'totalBA_Grid_' + iYear,
    selectors: ['MCD64A1','ModL2T','TotalPix','layer']
  });
}
