import { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function DiagnosticScreen() {
  const [clickCount, setClickCount] = useState(0);
  
  useEffect(() => {
    console.log('🔍 Diagnostic Screen mounted');
    console.log('🔍 Platform:', Platform.OS);
    console.log('🔍 Platform select:', Platform.select({
      web: 'WEB',
      ios: 'iOS',
      android: 'Android',
      default: 'Unknown'
    }));
  }, []);

  const handleTestClick = () => {
    console.log('🔘 Diagnostic button clicked:', clickCount + 1);
    setClickCount(prev => prev + 1);
    
    // Test both console log and alert
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform detected');
    }
    
    Alert.alert('Success!', `Button clicked ${clickCount + 1} times`);
  };

  const handleAlertOnly = () => {
    Alert.alert('Alert Test', 'This is just an alert test');
  };

  const handleConsoleOnly = () => {
    console.log('🔘 Console only button clicked');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>App Diagnostic</Text>
      <Text style={styles.info}>Platform: {Platform.OS}</Text>
      <Text style={styles.info}>Click Count: {clickCount}</Text>
      
      <TouchableOpacity style={styles.button} onPress={handleTestClick}>
        <Text style={styles.buttonText}>Full Test (Console + Alert)</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={handleAlertOnly}>
        <Text style={styles.buttonText}>Alert Only</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={handleConsoleOnly}>
        <Text style={styles.buttonText}>Console Only</Text>
      </TouchableOpacity>
      
      <View style={styles.debugInfo}>
        <Text style={styles.debugText}>
          Environment:{'\n'}
          EXPO_PUBLIC_SUPABASE_URL: {process.env.EXPO_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET'}{'\n'}
          Platform.OS: {Platform.OS}{'\n'}
          React Native version: {Platform.constants?.reactNativeVersion?.major || 'Unknown'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  info: {
    fontSize: 16,
    marginBottom: 10,
    color: '#666',
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    minWidth: 200,
    alignItems: 'center',
    // Explicit web support for clicks
    cursor: 'pointer',
    userSelect: 'none',
    // Ensure the button can receive touch events
    pointerEvents: 'auto',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  debugInfo: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  debugText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#333',
  },
});