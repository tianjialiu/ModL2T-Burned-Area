# Validation

Survey and fine-resolution satellite validation datasets for ModL2T burned area, MCD64A1, and MxD14A1 active fires.

## Validation Datasets
See Figures 3-5 and Table 2 for validation results in our [paper](https://doi.org/10.1088/2515-7620/ab056c).

### Household Survey
1a. **surveyVillages.shp**: shapefile of villages with household survey responses

1b. **surveyBA.csv**: percent burned per village, weighted by landholding area

1c. **MCD64A1_Valid.csv** and **ModL2T_Valid.csv**: satellite-derived burned area for each village  
We relate this to the survey percent burned per village by dividing the satellite-derived burned area by the total agricultural area within the village.

### Fine-Resolution Satellite Imagery
2a. **SmokeFires.kml**: locations of actively-burning fields where the smoke plume is visible  
We looked at the few fine-resolution historical images available in Google Earth and identified fields actively burning at the time. We also identified partial burn versus whole burn in this dataset, although this could be biased due to the limited number of free DigitalGloba/Airbus scenes available. If you open the file in Google Earth and click on a pin, it should take you to the historical image. Note that the date recorded for each point is Indian Standard Time.

## Publication
Liu T., Marlier M.E., Karambelas A.N., Jain M., Singh S., Singh M.K., Gautam, R., and DeFries R.S. (2019). Missing emissions from post-monsoon agricultural fires in northwestern India: regional limitations of MODIS burned area and active fire products. *Environ. Res. Commun.*, 1, 011007. https://doi.org/10.1088/2515-7620/ab056c
