import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../styles';
import InfoRow from './InfoRow';

const OrderInfoSection = ({ order }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Order Information</Text>
    <View style={styles.card}>
      <InfoRow icon="numbers" iconColor={colors.indigo500} label="Order Number" value={order.order_number} />
      <InfoRow icon="info-outline" iconColor={colors.blue800} label="Status" value={order.status} />
      {order.assigned_driver && (
        <InfoRow
          icon="person"
          iconColor={colors.purple500}
          label="Assigned Driver"
          value={order.assigned_driver.full_name}
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

export default OrderInfoSection;