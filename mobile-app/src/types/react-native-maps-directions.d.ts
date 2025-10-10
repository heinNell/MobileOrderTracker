declare module 'react-native-maps-directions' {
  import { Component } from 'react';
  import { LatLng, MapViewProps } from 'react-native-maps';

  export type MapDirectionsOrigin = LatLng | string;
  export type MapDirectionsDestination = LatLng | string;
  export type MapDirectionsWaypoints = (LatLng | string)[];
  export type MapDirectionsMode = 'DRIVING' | 'BICYCLING' | 'TRANSIT' | 'WALKING';
  export type MapDirectionsLanguage =
    | 'en'
    | 'es'
    | 'fr'
    | 'de'
    | 'ru'
    | 'zh'
    | string;

  export interface MapDirectionsProps {
    origin: MapDirectionsOrigin;
    destination: MapDirectionsDestination;
    apikey: string;
    waypoints?: MapDirectionsWaypoints;
    language?: MapDirectionsLanguage;
    mode?: MapDirectionsMode;
    precision?: 'high' | 'low';
    splitWaypoints?: boolean;
    directionsServiceBaseUrl?: string;
    region?: string;
    alternatives?: boolean;
    strokeWidth?: number;
    strokeColor?: string;
    strokeColors?: string[];
    onStart?: (params: any) => void;
    onReady?: (result: any) => void;
    onError?: (errorMessage: any) => void;
    optimizeWaypoints?: boolean;
    timePrecision?: 'none' | 'now' | string;
    resetOnChange?: boolean;
  }

  export default class MapViewDirections extends Component<MapDirectionsProps> {}
}
