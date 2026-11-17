import { CatalogItem, DatasetMetadata, DatasetStyle, LoadedDatasetResult } from '../types';
import { localSpatialDataService } from './localSpatialDataService';

export const fetchCatalog = async (): Promise<CatalogItem[]> => {
  return await localSpatialDataService.getCatalog();
};

export const fetchDatasetMetadata = async (folder: string): Promise<DatasetMetadata | null> => {
  const result = await localSpatialDataService.loadDataset(folder);
  return result.metadata;
};

export const fetchDatasetStyle = async (folder: string): Promise<DatasetStyle | null> => {
  const result = await localSpatialDataService.loadDataset(folder);
  return result.style;
};

export const fetchDatasetGeoJson = async (folder: string): Promise<any | null> => {
  const result = await localSpatialDataService.loadDataset(folder);
  return result.geoJson;
};

export const fetchDatasetRaster = async (folder: string): Promise<ArrayBuffer | null> => {
  const result = await localSpatialDataService.loadDataset(folder);
  return result.rasterBuffer;
};

export const loadFullDataset = async (folder: string, forceReload: boolean = false): Promise<LoadedDatasetResult> => {
  return await localSpatialDataService.loadDataset(folder, forceReload);
};
