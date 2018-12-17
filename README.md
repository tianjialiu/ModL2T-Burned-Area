# ModL2T-Burned-Area

ModL2T: hybrid MODIS and Landsat algorithm for estimating post-monsoon burned area from agricultural fires in northwestern India

This algorithm is based in Google Earth Engine (GEE) and R.

## GEE Repository
For GEE Code Editor:
```
https://code.earthengine.google.com/?accept_repo=users/tl2581/ModL2T_BA
```
Clone GEE Git Repository in Terminal:
```
git clone https://earthengine.googlesource.com/users/tl2581/ModL2T_BA
```

## Datasets
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
Liu T., Marlier M.E., Karambelas A.N., Jain M., Singh S., Singh M.K., Gautam, R., and DeFries R.S. (in review). Missing emissions from post-monsoon agricultural fires in northwestern India: regional limitations of MODIS burned area and active fire products.

EarthArXiv Preprint DOI: https://dx.doi.org/10.17605/OSF.IO/9JVAK
