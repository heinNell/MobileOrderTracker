// src/types/navigation.ts
import { NavigatorScreenParams } from '@react-navigation/native';
import type { Order } from '../../../shared/types';

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  Login: undefined;
  OrderDetails: { order?: Order; orderId?: string };
  LoadActivation: { orderId: string; orderNumber: string };
  SetupVerification: undefined;
  ReportIncident: { orderId: string };
  QRScanner: { orderId?: string; orderNumber?: string };
  Messages: { orderId: string };
};

export type TabParamList = {
  Home: undefined;
  Scanner: undefined;
  Orders: undefined;
  Profile: undefined;
};