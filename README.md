# ModL2T Burned Area

ModL2T: hybrid MODIS and Landsat algorithm for estimating post-monsoon burned area from agricultural fires in northwestern India

This algorithm is based in Google Earth Engine (EE) and R.

## EE Repository
For EE Code Editor:
```
https://code.earthengine.google.com/?accept_repo=users/tl2581/ModL2T_BA
```
Clone EE Git Repository in Terminal:
```
git clone https://earthengine.googlesource.com/users/tl2581/ModL2T_BA
```

## ModL2T Burned Area in EE
The output dataset, ModL2T burned area, is annual and at 30-m spatial resolution.

Example script:
```
// Read ModL2T burned area in Earth Engine
var modl2tBA = ee.ImageCollection('projects/GlobalFires/IndiaAgFires/ModL2T_BA');

// Example: filter 'modl2tBA' image collection for the year 2016
// Each image pixel has confidence values from 1-6
var modl2tBA_yrConf = modl2tBA.filter(ee.Filter.calendarRange(2016,2016,'year')).first();

// We used only values > 1 in our final classification of burned area
var modl2tBAyr = modl2tBA_yrConf.gt(1).selfMask();

// Visualize burned area classification confidence
Map.setCenter(76,30,7);
Map.addLayer(modl2tBA_yrConf, {min: 1, max: 6, palette: ['yellow','orange','red']});
```

## Input Datasets
We use the following datasets:

#### MODIS, Collection 6:
* MCD64A1 Burned Area, 500m
* MOD09A1 8-Day Composite Surface Reflectance, 500m
* MxD14A1 Active Fires, 1km

#### Landsat 5 (TM), 7 (ETM+), 8 (OLI/TIRS):
* Surface Reflectance, 30m

#### GlobeLand30:
* 10-class global land cover for 2010, 30m

## Updates
* March 10, 2018: MCD64A1 C6 added as a collection in GEE

## Known Issues
* MODIS and Landsat NBR composites were projected to geographic projection (lat/lon, EPSG:4326) and exported as assets to speed up calculations in GEE and prevent computational timeouts

## Publication
Liu T., Marlier M.E., Karambelas A.N., Jain M., Singh S., Singh M.K., Gautam, R., and DeFries R.S. (2019). Missing emissions from post-monsoon agricultural fires in northwestern India: regional limitations of MODIS burned area and active fire products. *Environ. Res. Commun.*, 1, 011007. https://doi.org/10.1088/2515-7620/ab056c

EarthArXiv Preprint DOI: https://doi.org/10.17605/OSF.IO/9JVAK
