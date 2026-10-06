declare module 'leaflet' {
  export type LatLngExpression = [number, number] | { lat: number; lng: number; alt?: number };
  export type LatLngBoundsExpression = unknown;

  export interface FitBoundsOptions {
    [key: string]: unknown;
  }

  export interface MapOptions {
    center?: LatLngExpression;
    zoom?: number;
    [key: string]: unknown;
  }

  export interface TileLayerOptions {
    maxZoom?: number;
    attribution?: string;
    [key: string]: unknown;
  }

  export interface GeoJSONOptions {
    onEachFeature?: (feature: unknown, layer: unknown) => void;
    [key: string]: unknown;
  }

  export interface LatLngBounds {
    [key: string]: unknown;
  }

  export class Map {
    getZoom(): number;
    fitBounds(bounds: unknown, options?: FitBoundsOptions): this;
    zoomOut(delta?: number): this;
  }

  export class Layer {
    on(events: Record<string, (...args: unknown[]) => void>): this;
    setStyle(style: unknown): this;
    bindTooltip(content: string, options?: Record<string, unknown>): this;
  }

  export class GeoJSON<P = unknown, G = unknown> extends Layer {
    getBounds(): LatLngBounds;
  }

  export class TileLayer extends Layer {}

  export interface LatLng {
    lat: number;
    lng: number;
  }

  export interface DivIconOptions {
    className?: string;
    html?: string;
    iconSize?: [number, number];
    iconAnchor?: [number, number];
    [key: string]: unknown;
  }

  export class DivIcon {}

  export function divIcon(options: DivIconOptions): DivIcon;

  export class Marker {
    getLatLng(): LatLng;
  }
}
