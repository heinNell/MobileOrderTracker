import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../_styles';

const TimelineItem = ({ icon, color, label, value, isCompleted, isLast }) => (
  <View style={[styles.timelineItem, isLast && styles.timelineItemLast]}>
    <View style={styles.timelineIconSection}>
      <View style={[{ backgroundColor: isCompleted ? color : colors.gray300 }, styles.timelineIconWrapper]}>
        <MaterialIcons name={icon} size={18} color={colors.white} />
      </View>
      {!isLast && (
        <View style={[{ backgroundColor: isCompleted ? color : colors.gray300 }, styles.timelineLine]} />
      )}
    </View>
    <View style={styles.timelineContent}>
      <Text style={[styles.timelineLabel, isCompleted && styles.timelineLabelCompleted]}>{label}</Text>
      <Text style={[styles.timelineValue, !isCompleted && styles.timelineValuePending]}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  timelineItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  timelineItemLast: {
    paddingBottom: 16,
  },
  timelineIconSection: {
    alignItems: 'center',
    marginRight: 14,
  },
  timelineIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineLine: {
    width: 3,
    flex: 1,
    marginTop: 6,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 2,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray600,
    marginBottom: 4,
  },
  timelineLabelCompleted: {
    color: colors.gray800,
  },
  timelineValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray900,
    lineHeight: 20,
  },
  timelineValuePending: {
    color: colors.gray500,
    fontStyle: 'italic',
  },
});

export default TimelineItem;