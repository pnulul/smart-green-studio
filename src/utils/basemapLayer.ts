import L from 'leaflet';
import { basemapOptions } from '../config/maps';

// Render monochrome pixels into the tile itself so PNG/PDF exports retain the style.
// CSS filters alone are not preserved by all DOM-to-image renderers.
class MonochromeTileLayer extends L.TileLayer {
  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const canvas = document.createElement('canvas');
    const size = this.getTileSize();
    canvas.width = size.x;
    canvas.height = size.y;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Map tile canvas is unavailable');
        context.drawImage(image, 0, 0, size.x, size.y);
        const pixels = context.getImageData(0, 0, size.x, size.y);
        for (let i = 0; i < pixels.data.length; i += 4) {
          const gray = Math.round(pixels.data[i] * 0.2126 + pixels.data[i + 1] * 0.7152 + pixels.data[i + 2] * 0.0722);
          pixels.data[i] = gray;
          pixels.data[i + 1] = gray;
          pixels.data[i + 2] = gray;
        }
        context.putImageData(pixels, 0, 0);
        done(undefined, canvas);
      } catch (error) {
        done(error instanceof Error ? error : new Error('Map tile rendering failed'), canvas);
      }
    };
    image.onerror = () => done(new Error('Map tile loading failed'), canvas);
    image.src = this.getTileUrl(coords);
    return canvas;
  }
}

export function createBasemapLayer(url: string, options: L.TileLayerOptions = basemapOptions(url)): L.TileLayer {
  return options.className?.includes('sgs-light-tile')
    ? new MonochromeTileLayer(url, options)
    : L.tileLayer(url, options);
}
