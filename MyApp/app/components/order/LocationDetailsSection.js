import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../_styles';

import InfoRow from '../ui/InfoRow';

const LocationDetailsSection = ({ order }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Location Details</Text>
    <View style={styles.card}>
      <InfoRow icon="place" iconColor={colors.success} label="Loading Point" value={order.loading_point_name} />
      <InfoRow icon="location-on" iconColor={colors.danger} label="Delivery Point" value={order.unloading_point_name} />
      {order.estimated_distance_km && (
        <InfoRow
          icon="straighten"
          iconColor={colors.warning}
          label="Est. Distance"
          value={`${order.estimated_distance_km} km`}
          isLast
        />
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray800,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 4,
  },
});

export default LocationDetailsSection;