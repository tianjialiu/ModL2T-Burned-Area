/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var indiaShp = ee.FeatureCollection("projects/GlobalFires/IndiaAgFires/IND_adm1"),
    mcd64a1 = ee.ImageCollection("MODIS/006/MCD64A1"),
    glc30 = ee.Image("projects/GlobalFires/IndiaAgFires/glc30"),
    mcd12q1 = ee.ImageCollection("MODIS/006/MCD12Q1"),
    modisNBR = ee.ImageCollection("projects/GlobalFires/IndiaAgFires/modisNBR"),
    landsatNBR = ee.ImageCollection("projects/GlobalFires/IndiaAgFires/landsatNBR");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// --------------------------------------------------------------------
// MODIS + Landsat Two-Tailed Normalized Burn Ratio (ModL2T NBR)
// burned area estimation in Punjab and Haryana, India
// for the post-monsoon burning season from October to November
// Datasets: MODIS\Terra C6 MOD09A1 (8-day composite) & Landsat 5,7,8
// --------------------------------------------------------------------
// Author: Tianjia Liu
// Last Updated: October 1, 2018

// Default visualization layer: ModL2T BA in 2016

// Input Parameters:
var params = require('users/tl2581/ModL2T_BA:InputParams.js');
var outputRegion = ee.Geometry.Rectangle([73.7,27.5,77.7,32.7],'EPSG:4326',false);
var exportToAssets = false;

// Time Period
var sYear = params.sYear; // Start Year
var eYear = params.eYear; // End Year

// State Boundaries
var punjab = indiaShp.filterMetadata('STATE','equals','PUNJAB');
var haryana = indiaShp.filterMetadata('STATE','equals','HARYANA');
var states = haryana.merge(punjab);

var Shp = states;

// Params: NBR Thresholds, MODIS-Landsat NBR Difference Compensation
var preThresh = params.preThresh;
var postThresh = params.postThresh;
var preDiff = params.preDiff;
var postDiff = params.postDiff;

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
  leftField: 'STATE',
  rightField: 'STATE'
});

var modisScale = ee.Image(modisNBR.first());
var landScale = ee.Image(landsatNBR.first());
var glc30Re = glc30.reproject({crs: landScale.projection(), scale: landScale.projection().nominalScale()});

// ------------- START OF LOOP ---------------
var totalBA = [];
for(var iYear = sYear; iYear <= eYear; iYear++) {

  // post-fire collection start and end dates
  var dateS_post = ee.Date.fromYMD(iYear, inMonths.get(2), inDays.get(2));
  var dateE_post = ee.Date.fromYMD(iYear, inMonths.get(3), inDays.get(3));
  
  // MCD12Q1 C6 agricultural mask
  var mcd12q1Yr = ee.Image(mcd12q1.filter(ee.Filter.calendarRange(iYear,iYear,'year')).first())
    .select('LC_Type2').eq(12);

  // MCD64A1 C6 Burned Area
  var mcd64a1Yr = ee.Image(mcd64a1.filterDate(dateS_post,dateE_post).select('BurnDate').max())
    .gt(0).unmask(0)
    .reproject({crs: modisScale.projection(), scale: modisScale.projection().nominalScale()});
  
  var modisNBRyr = modisNBR.filter(ee.Filter.calendarRange(iYear,iYear,'year')).first();
  var modis_NBRpre = modisNBRyr.select('preFire');
  var modis_NBRpost = modisNBRyr.select('postFire');

  var landsatNBRyr = landsatNBR.filter(ee.Filter.calendarRange(iYear,iYear,'year')).first();
  var landsat_NBRpre = landsatNBRyr.select('preFire');
  var landsat_NBRpost = landsatNBRyr.select('postFire');

// ----------- Burned Area -------------
// MODIS & Landsat-derived burned area
  var modisBA = modis_NBRpre.gt(ee.Array(preThresh.get(iYear-sYear)))
    .multiply(modis_NBRpost.lt(ee.Array(postThresh.get(iYear-sYear))))
    .gt(0).unmask(0)
    .reproject({crs: modisScale.projection(), scale: modisScale.projection().nominalScale()});

  var landsatBA = landsat_NBRpre.add(ee.Array(preDiff.get(iYear-sYear)))
    .gt(ee.Array(preThresh.get(iYear-sYear)))
    .multiply(landsat_NBRpost.add(ee.Array(postDiff.get(iYear-sYear)))
    .lt(ee.Array(postThresh.get(iYear-sYear)))).gt(0).unmask(0)
    .reproject({crs: landScale.projection(), scale: landScale.projection().nominalScale()});
    
  // Merge MODIS and Landsat-derived burned area  
  var landsatPreRe = landsat_NBRpre
    .reduceResolution({
      reducer: ee.Reducer.mean(),
      maxPixels: 1024
    }).reproject({crs: modisScale.projection(), scale: modisScale.projection().nominalScale()});

  var landsatPostRe = landsat_NBRpost
    .reduceResolution({
      reducer: ee.Reducer.mean(),
      maxPixels: 1024
    }).reproject({crs: modisScale.projection(), scale: modisScale.projection().nominalScale()});
  
  var mergeThresh = 0.1;
  // Replace MODIS pixels with Landsat pixels where the merging criteria is met
  var landsatMask = modis_NBRpre.subtract(landsatPreRe).abs().lt(mergeThresh)
    .multiply(modis_NBRpost.subtract(landsatPostRe).abs().lt(mergeThresh)).unmask(0);

  var landsatRevMask = landsatMask.eq(0);
      
  var burnAll = landsatBA.multiply(landsatMask)
    .add(modisBA.add(mcd64a1Yr).multiply(mcd12q1Yr).gt(0).multiply(landsatRevMask))
    .updateMask(glc30Re.eq(10)).gt(0)
    .reproject({crs: landScale.projection(), scale: landScale.projection().nominalScale()});
  
  // Confidence Scores: MODIS = 1, Landsat = 2, MCD64A1 = 3
  var burnConf = landsatBA.multiply(landsatMask).multiply(2).add(modisBA)
    .add(mcd64a1Yr.multiply(3)).rename('confidence')
    .updateMask(burnAll)
    .reproject({crs: landScale.projection(), scale: landScale.projection().nominalScale()})
    .set('system:time_start',ee.Date.fromYMD(iYear,10,1));
    
  if (iYear == 2016) {var display = true;} else {var display = false;}
  // Visualize Burned Area & Print Stats
  Map.setCenter(75.8, 30.8, 8);
  // Layers are by default off, click on layers to visualize
  Map.addLayer(burnConf.updateMask(burnConf).clip(Shp),
    {palette:["#FFFFB2","#FED976","#FEB24C","#FD8D3C","#F03B20","#BD0026"]}, iYear.toString(), display);

  var modl2tBAyr = burnAll.multiply(burnConf.gt(1)).rename('ModL2T')
    .addBands(burnConf.eq(1).rename('ModL2T_C1'))
    .addBands(burnConf.eq(2).rename('ModL2T_C2'))
    .addBands(burnConf.eq(3).rename('ModL2T_C3'))
    .addBands(burnConf.eq(4).rename('ModL2T_C4'))
    .addBands(burnConf.eq(5).rename('ModL2T_C5'))
    .addBands(burnConf.eq(6).rename('ModL2T_C6'))
    .multiply(ee.Image.pixelArea()).multiply(1/1000/1000)
    .reduceRegions({
      collection: Shp,
      reducer: ee.Reducer.sum(),
    });
  
  var mcd64a1BAyr = mcd64a1Yr.multiply(mcd12q1Yr).rename('MCD64A1')
    .multiply(ee.Image.pixelArea()).multiply(1/1000/1000)
    .reduceRegions({
      collection: Shp,
      reducer: ee.Reducer.sum(),
      crs: modisScale.projection(),
      scale: modisScale.projection().nominalScale()
    });

  var combinedBAyr = modl2tBAyr.map(joinBA);
  var totalBA = ee.FeatureCollection(totalBA).merge(combinedBAyr.map(getPtYr));

  var modl2tBA = modl2tBAyr.reduceColumns({
    reducer: ee.Reducer.sum(),
    selectors: ['ModL2T']
  }).toArray().round().toList().get(0);
  
  print(iYear.toString() + ' ModL2T BA (km^2):');
  print(modl2tBA);

  var mcd64a1BA = mcd64a1BAyr.reduceColumns({
    reducer: ee.Reducer.sum(),
    selectors: ['sum']
  }).toArray().round().toList().get(0);

  // May reach memory limit; run export.table task
  print(iYear.toString() + ' MCD64A1 BA (km^2):');
  print(mcd64a1BA);
  print('----------------------');
  
  if (exportToAssets === true) {
    Export.image.toAsset({
      image: burnConf.clip(Shp),
      region: outputRegion,
      description: 'ModL2T_BA_' + iYear,
      assetId: 'projects/GlobalFires/IndiaAgFires/ModL2T_BA/' + 'ModL2T_BA_' + iYear,
      crs: 'EPSG:4326',
      scale: 30,
      maxPixels: 1e12
    });
  }
  
  if (iYear == 2016) {
    Export.image.toDrive({
      image: burnConf.clip(Shp),
      region: outputRegion,
      description: 'ModL2T_BA_' + iYear,
      crs: 'EPSG:4326',
      scale: 30,
      maxPixels: 1e12
    });
  }
}

// Run task, can take a couple minutes to finish
Export.table.toDrive({
  collection: totalBA,
  description: 'totalBA_States',
  selectors: ['MCD64A1','ModL2T','ModL2T_C1','ModL2T_C2'
  ,'ModL2T_C3','ModL2T_C4','ModL2T_C5','ModL2T_C6',
  'STATE','.geo']
});
