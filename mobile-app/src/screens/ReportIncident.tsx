// src/screens/ReportIncident.tsx
import { supabase } from '@/lib/supabase';
import { LocationService } from '@/services/locationService';
import type { RootStackParamList } from '@/types/navigation';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { toPostGISPoint } from '@shared/locationUtils';
import type { IncidentType } from '@shared/types';
import { INCIDENT_SEVERITY } from '@shared/types';
import React, { useCallback, useState } from 'react';
import
  {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
  } from 'react-native';

// Define navigation and route props
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ReportIncident'>;
type RoutePropType = RouteProp<RootStackParamList, 'ReportIncident'>;

const ReportIncidentScreen: React.FC = () => {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation<NavigationProp>();
  const { orderId } = route.params;

  const [incidentType, setIncidentType] = useState<IncidentType | null>(null);
  const [severity, setSeverity] = useState<number>(1);
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const types: IncidentType[] = ['delay', 'mechanical', 'traffic', 'weather', 'accident', 'other'];

  const handleSubmit = useCallback(async () => {
    if (!incidentType || !description.trim()) {
      Alert.alert('Error', 'Please select a type and add a description.');
      return;
    }

    try {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to report an incident.');
        navigation.navigate('Login');
        return;
      }

      const location = await LocationService.getCurrentLocation();
      const locationWkt = location ? toPostGISPoint(location.coords) : null;

      const { error } = await supabase.from('incidents').insert({
        order_id: orderId,
        driver_id: user.id,
        incident_type: incidentType,
        title: incidentType.charAt(0).toUpperCase() + incidentType.slice(1),
        description,
        location: locationWkt,
        severity,
        is_resolved: false,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      Alert.alert('Success', 'Incident reported successfully.');
      navigation.goBack();
    } catch (e: any) {
      console.error('Report incident error:', e);
      Alert.alert('Error', e?.message || 'Failed to report incident.');
    } finally {
      setLoading(false);
    }
  }, [incidentType, severity, description, orderId, navigation]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Report Incident for Order #{orderId}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Incident Type</Text>
        <View style={styles.options}>
          {types.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.option, incidentType === type && styles.optionSelected, styles.optionMargin]}
              onPress={() => setIncidentType(type)}
            >
              <Text style={styles.optionText}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Severity</Text>
        <View style={styles.options}>
          {Object.entries(INCIDENT_SEVERITY).map(([level, label]) => (
            <TouchableOpacity
              key={level}
              style={[styles.option, severity === parseInt(level) && styles.optionSelected, styles.optionMargin]}
              onPress={() => setSeverity(parseInt(level))}
            >
              <Text style={styles.optionText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <TextInput
          style={styles.input}
          multiline
          numberOfLines={4}
          placeholder="Describe the incident..."
          value={description}
          onChangeText={setDescription}
        />
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Submit Report</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16 },
  section: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
  options: { flexDirection: 'row', flexWrap: 'wrap' },
  option: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  optionSelected: { backgroundColor: '#3B82F6' },
  optionText: { color: '#111827', fontWeight: '500' },
  optionMargin: { marginRight: 8, marginBottom: 8 },
  input: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB' },
  submitButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default ReportIncidentScreen;
