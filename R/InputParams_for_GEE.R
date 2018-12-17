## =================================================
# Calculate and print quantile-based NBR thresholds
# and MODIS-Landsat NBR difference compensation
# for ModL2T BA classification
## =================================================

## =================================================
# Input files: modisThresh, nbrDiff
# downloaded from Google Earth Engine
## =================================================
# Set working directory: where the downloaded GEE file resides
setwd("/Users/TLiu/Google Drive/")
nbrThresh <- read.table("modisThresh.csv",sep=",",header=T)
nbrThresh <- nbrThresh[,-c(1,ncol(nbrThresh))]
nbrDiff <- read.table("nbrDiff.csv",sep=",",header=T)

## =================================================
# Separate the NBR percentiles for pre- (max) and
# post-fire (min) fire vs. no-fire distributions
## =================================================
TmaxFire <- nbrThresh[,1:101]
TmaxNoFire <- nbrThresh[,102:202]
TminFire <- nbrThresh[,203:303]
TminNoFire <- nbrThresh[,304:404]

# Percentile names: define reordering scheme in ascending order
perNames <- substr(colnames(TmaxFire),nchar("TmaxFire")+3,nchar("TmaxFire")+5)
perNames <- order(as.numeric(perNames))

## =================================================
# Loop through the study years and
# print the 2 thresholds to input back into GEE
## =================================================
TmaxNBR <- rep(NA,nrow(nbrThresh))
TminNBR <- rep(NA,nrow(nbrThresh))
TQmax <- rep(NA,nrow(nbrThresh))
TQmin <- rep(NA,nrow(nbrThresh))

for (iYear in 1:nrow(nbrThresh)) {
  T1maxFire <- (TmaxFire[iYear,])[perNames]
  T2maxNoFire <- rev(TmaxNoFire[iYear,][perNames])
  TmaxDiff <- T1maxFire - T2maxNoFire
  Qmax <- which(abs(TmaxDiff)==min(abs(TmaxDiff)))[1]
  TmaxNBR[iYear] <- mean(c(as.numeric(T1maxFire[Qmax]),as.numeric(T2maxNoFire[Qmax])))
  TQmax[iYear] <- as.numeric(substr(names(T1maxFire[Qmax]),11,14))
  
  T1minFire <- (TminFire[iYear,])[perNames]
  T2minNoFire <- rev(TminNoFire[iYear,][perNames])
  TminDiff <- T1minFire - T2minNoFire
  Qmin <- which(abs(TminDiff)==min(abs(TminDiff)))[length(which(abs(TminDiff)==min(abs(TminDiff))))]
  TminNBR[iYear] <- mean(c(as.numeric(T1minFire[Qmin]),as.numeric(T2minNoFire[Qmin])))
  TQmin[iYear] <- as.numeric(substr(names(T1minFire[Qmin]),11,14))
}

# Copy threshold values and paste in GEE params file
print("=============== Start: Copy to GEE ===============")
print("-----------------TmaxNBR-----------------")
print(paste0(round(TmaxNBR,3),collapse=","))
print("-----------------TminNBR----------------")
print(paste0(round(TminNBR,3),collapse=","))
print("-----------------preDiffNBR-----------------")
print(paste0(round(nbrDiff$preDiff,3),collapse=","))
print("-----------------postDiffNBR----------------")
print(paste0(round(nbrDiff$postDiff,3),collapse=","))
print("=============== End: Copy to GEE ===============")
