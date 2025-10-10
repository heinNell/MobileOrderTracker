declare module 'react-native-svg' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface SvgProps extends ViewProps {
    width?: number | string;
    height?: number | string;
    viewBox?: string;
  }

  export interface PathProps {
    d?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number | string;
  }

  export interface CircleProps {
    cx?: number | string;
    cy?: number | string;
    r?: number | string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number | string;
  }

  export default class Svg extends Component<SvgProps> {}
  export class Path extends Component<PathProps> {}
  export class Circle extends Component<CircleProps> {}
  export class Rect extends Component<any> {}
  export class Line extends Component<any> {}
  export class Polygon extends Component<any> {}
  export class Polyline extends Component<any> {}
  export class Text extends Component<any> {}
  export class G extends Component<any> {}
  export class Defs extends Component<any> {}
  export class LinearGradient extends Component<any> {}
  export class RadialGradient extends Component<any> {}
  export class Stop extends Component<any> {}
}
