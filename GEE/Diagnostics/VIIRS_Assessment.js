/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var indiaShp = ee.FeatureCollection("projects/GlobalFires/IndiaAgFires/IND_adm1"),
    modl2t = ee.ImageCollection("projects/GlobalFires/IndiaAgFires/ModL2T_BA"),
    mcd64a1 = ee.ImageCollection("MODIS/006/MCD64A1"),
    mcd12q1 = ee.ImageCollection("MODIS/006/MCD12Q1");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// -------------------------------------------------
// Download MODIS pre and post-fire NBR to estimate
// two-tailed burned area thresholds
// -------------------------------------------------
// Author: Tianjia Liu
// Last updated: October 1, 2018

// Input Parameters:
var params = require('users/tl2581/ModL2T_BA:InputParams.js');

// Time Period
var sYear = 2012; // Start Year
var eYear = params.eYear; // End Year

// State Boundaries
var punjab = indiaShp.filterMetadata('STATE','equals','PUNJAB');
var haryana = indiaShp.filterMetadata('STATE','equals','HARYANA');
var states = haryana.merge(punjab).geometry();

var Shp = states;

// Pre-fire and post-fire Collection Dates
var inMonths = params.inMonths;
var inDays = params.inDays;

var modisScale = ee.Image(mcd12q1.first());

var bufferPts = function(feature) {
  return feature.buffer(375);
};

// ------------- START OF LOOP ---------------
var modl2t_Commission = []; var mcd64a1_Commission = [];
var modl2t_Omission = []; var mcd64a1_Omission = [];
for(var iYear = sYear; iYear <= eYear; iYear++) {
  
  var filterYr = ee.Filter.calendarRange(iYear,iYear,'year');
  var filterMon = ee.Filter.calendarRange(10,11,'month');
  
  // ModL2T BA
  var modl2tYr = ee.Image(modl2t.filter(filterYr).first()).gt(1).selfMask();

  // MCD12Q1 C6 agricultural mask
  var mcd12q1Yr = ee.Image(mcd12q1.filter(filterYr).first())
    .select('LC_Type2').eq(12);

  // MCD64A1 C6 Burned Area
  var mcd64a1Yr = ee.Image(mcd64a1.filter(filterYr).filter(filterMon).select('BurnDate').max())
    .gt(0).selfMask()
    .reproject({crs: modisScale.projection(), scale: modisScale.projection().nominalScale()});
  
  // VIIRS active fires
  var viirsOct = ee.FeatureCollection('projects/GlobalFires/VNP14IMGML/VNP14IMGML_' +
      iYear + '_10');
  var viirsNov = ee.FeatureCollection('projects/GlobalFires/VNP14IMGML/VNP14IMGML_' +
      iYear + '_11');
  
  var viirsPts = viirsOct.merge(viirsNov).filterMetadata('type','equals',0)
    .filterBounds(Shp).map(bufferPts);

  var modl2tYr_Omission = modl2tYr.reduceRegions({
    collection: viirsPts,
    reducer: ee.Reducer.count().unweighted(),
    crs: 'EPSG:4326',
    scale: 30
  });

  var mcd64a1Yr_Omission = mcd64a1Yr.reduceRegions({
    collection: viirsPts,
    reducer: ee.Reducer.count().unweighted(),
    crs: modisScale.projection(),
    scale: modisScale.projection().nominalScale()
  });
  
  var modl2tYr_Commission = modl2tYr.rename('ModL2T')
    .addBands(modl2tYr.clip(viirsPts).rename('ModL2T_Agree'))
    .reduceRegions({
      collection: Shp,
      reducer: ee.Reducer.count().unweighted(),
      crs: 'EPSG:4326',
      scale: 30
    }).toList(1,0).get(0);
    
  var mcd64a1Yr_Commission = mcd64a1Yr.rename('MCD64A1')
    .addBands(mcd64a1Yr.clip(viirsPts).rename('MCD64A1_Agree'))
    .reduceRegions({
      collection: Shp,
      reducer: ee.Reducer.count().unweighted(),
      crs: modisScale.projection(),
      scale: modisScale.projection().nominalScale()
    }).toList(1,0).get(0);
  
  modl2t_Omission = ee.FeatureCollection(modl2t_Omission).merge(modl2tYr_Omission);
  mcd64a1_Omission = ee.FeatureCollection(mcd64a1_Omission).merge(mcd64a1Yr_Omission);
  
  modl2t_Commission[(iYear-sYear)] = ee.Feature(modl2tYr_Commission).setGeometry(ee.Geometry.Point(iYear,0));
  mcd64a1_Commission[(iYear-sYear)] = ee.Feature(mcd64a1Yr_Commission).setGeometry(ee.Geometry.Point(iYear,0));
}

Export.table.toDrive({
  collection: ee.FeatureCollection(modl2t_Commission),
  description: 'ModL2T_Commission',
});

Export.table.toDrive({
  collection: ee.FeatureCollection(mcd64a1_Commission),
  description: 'MCD64A1_Commission',
});

Export.table.toDrive({
  collection: ee.FeatureCollection(modl2t_Omission),
  description: 'ModL2T_Omission',
  selectors: ['YYYYMMDD','HHMM','conf','count']
});

Export.table.toDrive({
  collection: ee.FeatureCollection(mcd64a1_Omission),
  description: 'MCD64A1_Omission',
  selectors: ['YYYYMMDD','HHMM','conf','count']
});
