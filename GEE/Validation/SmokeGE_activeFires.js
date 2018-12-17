/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var smokeFires = ee.FeatureCollection("projects/GlobalFires/IndiaAgFires/smokeFires_GE"),
    mod14a1 = ee.ImageCollection("MODIS/006/MOD14A1"),
    myd14a1 = ee.ImageCollection("MODIS/006/MYD14A1");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// -------------------------------------------
// Validation of active fire geolocations 
// using in-progress fires identified from
// fine-resolution imagery in Google Earth
// -------------------------------------------
// Author: Tianjia Liu
// Last updated: October 17, 2018

var outputRegion = ee.Geometry.Rectangle([73.7,27.5,77.7,32.7],'EPSG:4326',false);

// Individual dates (IST) of imagery with in-progress fires
var xYears = [2010,2010,2011,2011,2011,2011,2012,2012,2013,2013,2013,2013,2013,2013,2014,2014,2014,2014,2014,2015,2015,2015,2015,2015,2016,2016,2016,2016,2016,2016,2016,2016,2016,2016];
var xMonths = [10,11,10,10,11,11,10,11,10,10,10,10,11,11,10,10,10,11,11,10,10,11,11,11,10,10,10,10,11,11,11,11,11,11];
var xDays = [9,7,20,31,6,14,21,20,16,17,22,25,13,17,13,21,22,6,18,17,30,7,16,22,11,14,19,22,7,10,13,15,21,26];
var nDates = ee.List(xYears).length();

var smokeAll = [];
for (var id = 0; id < nDates.getInfo(); id++) {
  var iYear = xYears[id];
  var iMonth = xMonths[id];
  var iDay = xDays[id];

  var sDate = ee.Date.fromYMD(iYear,iMonth,iDay);
  var eDate = sDate.advance(1,'day');

  var smokeFiresDay = smokeFires.filterMetadata('Year','equals',iYear)
    .filterMetadata('Month','equals',iMonth)
    .filterMetadata('Day','equals',iDay);

  var filterYr = ee.Filter.calendarRange(iYear,iYear,'year');
  var filterMon = ee.Filter.calendarRange(iMonth,iMonth,'month');
  var filterSeas = ee.Filter.calendarRange(10,11,'month');
  var filterDay = ee.Filter.calendarRange(iDay,iDay,'day_of_month');

  var modisProj = ee.Image(mod14a1.first()).select('MaxFRP').projection();

  var partialField = smokeFiresDay.filterMetadata('Type','equals','P')
    .reduceToImage(['ID'],'max').gt(0)
    .reproject({crs: modisProj, scale: modisProj.nominalScale()});

  var wholeField = smokeFiresDay.filterMetadata('Type','equals','W')
    .reduceToImage(['ID'],'max').gt(0)
    .reproject({crs: modisProj, scale: modisProj.nominalScale()});
  
  var terraDay = ee.Image(mod14a1.filterDate(sDate).sum())
    .select('MaxFRP').unmask(0);

  var aquaDay = ee.Image(myd14a1.filterDate(eDate).sum())
    .select('MaxFRP').unmask(0);

  var mxdx14a1Day = terraDay.add(aquaDay).gt(0);

  var smokeDayOmission = partialField.addBands(partialField.updateMask(mxdx14a1Day))
    .addBands(wholeField).addBands(wholeField.updateMask(mxdx14a1Day))
    .rename('Partial','PartialMxD14A1','Whole','WholeMxD14A1').reduceRegions({
      collection: outputRegion,
      reducer: ee.Reducer.sum().unweighted(),
      crs: modisProj,
      scale: modisProj.nominalScale()
   }).toList(1,0).get(0);
  
  smokeAll[id] = ee.Feature(smokeDayOmission)
    .set('Year',iYear).set('Month',iMonth).set('Day',iDay);
}

print(ee.FeatureCollection(smokeAll));

Export.table.toDrive({
  collection: ee.FeatureCollection(smokeAll),
  description: 'smokeFires_GE_MxD14A1_valid',
  selectors: ['Year','Month','Day','Partial','PartialMxD14A1','Whole','WholeMxD14A1']
});
