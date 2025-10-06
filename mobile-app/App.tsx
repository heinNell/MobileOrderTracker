// App.tsx
import "react-native-gesture-handler";
import React from "react";
import { Text, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import OrderDetailsScreen from "./src/screens/OrderDetailsScreen";

// Define your stack param list
export type RootStackParamList = {
  Home: undefined;
  OrderDetails: { orderId?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Placeholder home screen (replace with your real one)
function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Home Screen</Text>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "Home" }}
        />
        <Stack.Screen
          name="OrderDetails"
          component={OrderDetailsScreen as any}
          options={{ title: "Order Details" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}