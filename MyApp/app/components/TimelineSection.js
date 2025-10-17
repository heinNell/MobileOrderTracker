import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../styles';
import TimelineItem from './TimelineItem';

const TimelineSection = ({ timelineData }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Order Timeline</Text>
    <View style={styles.card}>
      {timelineData.map((item, index) => (
        <TimelineItem
          key={item.key}
          icon={item.icon}
          color={item.color}
          label={item.label}
          value={item.value}
          isCompleted={item.isCompleted}
          isLast={index === timelineData.length - 1}
        />
      ))}
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

export default TimelineSection;