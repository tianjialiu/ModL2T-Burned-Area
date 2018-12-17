// --------------------------------------
// Input Params for ModL2T Burned Area 
// --------------------------------------
// Author: Tianjia Liu
// Last updated: September 30, 2018

// Buned Area Classification Thresholds
var preThresh = ee.List([0.611,0.58,0.629,0.613,0.631,0.641,0.658,0.653,0.664,0.689,0.662,0.674,0.647,0.668]);
var postThresh = ee.List([-0.027,-0.041,-0.041,-0.012,-0.018,-0.036,-0.025,-0.014,-0.002,-0.004,-0.021,-0.042,-0.041,-0.049]);

// Landsat-MODIS NBR Difference
var preDiff = ee.List([0.223,0.141,0.086,0.133,0.209,0.042,0.005,0.041,0.097,0.122,0.037,0.025,0.019,0.015]);
var postDiff = ee.List([-0.07,-0.032,-0.024,-0.03,-0.015,0.021,0.013,-0.004,-0.017,-0.035,0.03,0.019,0.012,0.012]);

// Time Period
var sYear = 2003; // Starting Year
var eYear = 2016; // Ending Year

// Pre-fire and post-fire collection start and end dates
// 1. pre-fire start and 2. end month (day)
// 3. post-fire start and 4. end month (day)
var inMonths = ee.List([9,11,10,12]); 
var inDays = ee.List([1,1,1,1]);

// Global functions
// Select QA bits
var getQABits = function(image, start, end, newName) {
    var pattern = 0;
    for (var i = start; i <= end; i++) {
       pattern += Math.pow(2, i);
    }
    return image.select([0], [newName])
                  .bitwiseAnd(pattern)
                  .rightShift(start);
};

// Calculate NBR
// MODIS C6
var calcNBR_modis = function(image) {
  var QA = image.select('StateQA');
  var clear = getQABits(QA, 0, 1, 'clear').expression("b(0) == 0");
  var cloudMask = image.normalizedDifference(['sur_refl_b07','sur_refl_b01']);
  
  var nbr = image.normalizedDifference(['sur_refl_b02','sur_refl_b07']);
  var nbrMasked = nbr.updateMask(clear).updateMask(cloudMask.gt(0));
  return nbrMasked;
};

// Landsat
var calcNBR_l8 = function(image) {
  var QA = image.select('pixel_qa');
  var clear = getQABits(QA, 1, 1, 'clear');
  var cloudMask = image.normalizedDifference(['B7','B4']);
  
  var nbr = image.normalizedDifference(['B5','B7']);
  var nbrMasked = nbr.updateMask(clear).updateMask(cloudMask.gt(0));
  return nbrMasked;
};

var calcNBR_l5and7 = function(image) {
  var QA = image.select('pixel_qa');
  var clear = getQABits(QA, 1, 1, 'clear');
  var cloudMask = image.normalizedDifference(['B7','B3']);
  
  var nbr = image.normalizedDifference(['B4','B7']);
  var nbrMasked = nbr.updateMask(clear).updateMask(cloudMask.gt(0));
  return nbrMasked;
};

exports.preThresh = preThresh;
exports.postThresh = postThresh;
exports.preDiff = preDiff;
exports.postDiff = postDiff;

exports.sYear = sYear;
exports.eYear = eYear;
exports.inMonths = inMonths;
exports.inDays = inDays;

exports.getQABits = getQABits;
exports.calcNBR_modis = calcNBR_modis;
exports.calcNBR_l8 = calcNBR_l8;
exports.calcNBR_l5and7 = calcNBR_l5and7;
