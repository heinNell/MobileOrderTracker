import { Alert, Text, View } from 'react-native';

export default function TestButtonsScreen() {
  const testAlert = (buttonName) => {
    console.log(`🔘 ${buttonName} clicked!`);
    Alert.alert('Button Test', `${buttonName} is working!`);
  };

  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      padding: 20,
      gap: 20
    }}>
      <Text style={{ fontSize: 24, marginBottom: 30 }}>Button Test</Text>
      
      {/* Web Button */}
      <button 
        onClick={() => testAlert('Web Button')}
        style={{
          padding: '15px 30px',
          fontSize: '16px',
          backgroundColor: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        Web Button Test
      </button>
      
      {/* Div with onClick */}
      <div
        onClick={() => testAlert('Div Button')}
        style={{
          padding: '15px 30px',
          fontSize: '16px',
          backgroundColor: '#10b981',
          color: 'white',
          borderRadius: '8px',
          cursor: 'pointer',
          userSelect: 'none',
          textAlign: 'center'
        }}
      >
        Div Click Test
      </div>
    </View>
  );
}