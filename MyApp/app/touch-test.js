import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TouchTestScreen() {
  const handlePress = () => {
    console.log('🔘 Test button pressed!');
    Alert.alert('Success', 'Button is working!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Touch Test</Text>
      <TouchableOpacity style={styles.button} onPress={handlePress}>
        <Text style={styles.buttonText}>Test Touch</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});