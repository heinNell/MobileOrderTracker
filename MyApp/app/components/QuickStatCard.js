import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../styles';

const QuickStatCard = ({ icon, label, value, color }) => (
  <View style={styles.quickStatCard}>
    <View style={[styles.quickStatIcon, { backgroundColor: color + '15' }]}>
      <MaterialIcons name={icon} size={20} color={color} />
    </View>
    <Text style={styles.quickStatLabel}>{label}</Text>
    <Text style={styles.quickStatValue} numberOfLines={1}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  quickStatCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    minHeight: 100,
  },
  quickStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickStatLabel: {
    fontSize: 11,
    color: colors.gray500,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  quickStatValue: {
    fontSize: 14,
    color: colors.gray900,
    fontWeight: "700",
    textAlign: "center",
  },
});

export default QuickStatCard;