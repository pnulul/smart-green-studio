export const SATELLITE_BASEMAP = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  options: {
    crossOrigin: true as const,
    maxZoom: 20,
    maxNativeZoom: 19,
    className: 'sgs-satellite-tile',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  },
};

export const STREET_BASEMAP = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  options: {
    crossOrigin: true as const,
    maxZoom: 20,
    maxNativeZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
};

export const LIGHT_BASEMAP = {
  url: STREET_BASEMAP.url,
  options: {
    ...STREET_BASEMAP.options,
    className: 'sgs-light-tile',
  },
};

export function basemapOptions(url: string) {
  if (url === SATELLITE_BASEMAP.url) return SATELLITE_BASEMAP.options;
  if (url === LIGHT_BASEMAP.url) return LIGHT_BASEMAP.options;
  return STREET_BASEMAP.options;
}
