// Order Progress Timeline Component for Mobile Order Tracker
// Visual progression indicator showing order stages

import { MaterialIcons } from '@expo/vector-icons';
import
    {
        ScrollView,
        StyleSheet,
        Text,
        View
    } from 'react-native';
import { ORDER_STATUSES } from '../../services/StatusUpdateService';

const colors = {
  primary: "#2563eb",
  success: "#10b981",
  warning: "#f59e0b", 
  danger: "#ef4444",
  gray100: "#f1f5f9",
  gray200: "#e2e8f0",
  gray300: "#cbd5e1",
  gray400: "#94a3b8",
  gray500: "#64748b",
  gray600: "#475569",
  gray700: "#334155",
  gray900: "#0f172a",
  white: "#ffffff",
  green50: "#f0fdf4",
  green100: "#dcfce7",
  blue50: "#eff6ff",
  orange50: "#fff7ed",
  red50: "#fef2f2",
  shadowColor: "#000"
};

// Define the order progression stages
const ORDER_PROGRESSION_STAGES = [
  {
    status: ORDER_STATUSES.ASSIGNED,
    label: 'Assigned',
    description: 'Order assigned to driver',
    icon: 'assignment',
    phase: 'preparation'
  },
  {
    status: ORDER_STATUSES.ACTIVATED,
    label: 'Activated',
    description: 'Order activated and ready',
    icon: 'check-circle',
    phase: 'preparation'
  },
  {
    status: ORDER_STATUSES.IN_PROGRESS,
    label: 'Started',
    description: 'Journey has begun',
    icon: 'play-arrow',
    phase: 'journey'
  },
  {
    status: ORDER_STATUSES.IN_TRANSIT,
    label: 'En Route',
    description: 'Traveling to destination',
    icon: 'local-shipping',
    phase: 'journey'
  },
  {
    status: ORDER_STATUSES.ARRIVED_AT_LOADING_POINT,
    label: 'At Pickup',
    description: 'Arrived at loading point',
    icon: 'location-on',
    phase: 'loading'
  },
  {
    status: ORDER_STATUSES.LOADING,
    label: 'Loading',
    description: 'Loading cargo',
    icon: 'publish',
    phase: 'loading'
  },
  {
    status: ORDER_STATUSES.LOADED,
    label: 'Loaded',
    description: 'Cargo loaded successfully',
    icon: 'done-all',
    phase: 'loading'
  },
  {
    status: ORDER_STATUSES.ARRIVED_AT_UNLOADING_POINT,
    label: 'At Delivery',
    description: 'Arrived at delivery point',
    icon: 'location-on',
    phase: 'delivery'
  },
  {
    status: ORDER_STATUSES.UNLOADING,
    label: 'Unloading',
    description: 'Unloading cargo',
    icon: 'get-app',
    phase: 'delivery'
  },
  {
    status: ORDER_STATUSES.DELIVERED,
    label: 'Delivered',
    description: 'Successfully delivered',
    icon: 'check-circle',
    phase: 'completion'
  },
  {
    status: ORDER_STATUSES.COMPLETED,
    label: 'Completed',
    description: 'Order completed',
    icon: 'done-all',
    phase: 'completion'
  }
];

const PHASE_COLORS = {
  preparation: colors.primary,
  journey: colors.warning,
  loading: colors.success,
  delivery: colors.success,
  completion: colors.success
};

const PHASE_BACKGROUNDS = {
  preparation: colors.blue50,
  journey: colors.orange50,
  loading: colors.green50,
  delivery: colors.green50,
  completion: colors.green100
};

const OrderProgressTimeline = ({ 
  currentStatus, 
  orderHistory = [],
  compact = false 
}) => {
  
  // Determine which stages are completed, current, and upcoming
  const getStageState = (stage) => {
    const currentIndex = ORDER_PROGRESSION_STAGES.findIndex(s => s.status === currentStatus);
    const stageIndex = ORDER_PROGRESSION_STAGES.findIndex(s => s.status === stage.status);
    
    // Check if this stage was completed based on order history
    const wasCompleted = orderHistory.some(h => h.new_status === stage.status);
    
    if (stage.status === currentStatus) {
      return 'current';
    } else if (stageIndex < currentIndex || wasCompleted) {
      return 'completed';
    } else {
      return 'upcoming';
    }
  };

  const getStageColor = (stage, state) => {
    switch (state) {
      case 'completed':
        return colors.success;
      case 'current':
        return PHASE_COLORS[stage.phase];
      case 'upcoming':
        return colors.gray300;
      default:
        return colors.gray300;
    }
  };

  const getStageBackgroundColor = (stage, state) => {
    switch (state) {
      case 'completed':
        return colors.green50;
      case 'current':
        return PHASE_BACKGROUNDS[stage.phase];
      case 'upcoming':
        return colors.gray100;
      default:
        return colors.gray100;
    }
  };

  const renderStage = (stage, index) => {
    const state = getStageState(stage);
    const stageColor = getStageColor(stage, state);
    const backgroundColor = getStageBackgroundColor(stage, state);
    const isLast = index === ORDER_PROGRESSION_STAGES.length - 1;

    return (
      <View key={stage.status} style={styles.stageContainer}>
        <View style={styles.stageContent}>
          {/* Timeline line */}
          {!isLast && (
            <View style={[
              styles.timelineLine,
              { backgroundColor: state === 'completed' ? colors.success : colors.gray200 }
            ]} />
          )}
          
          {/* Stage indicator */}
          <View style={[
            styles.stageIndicator,
            { backgroundColor: backgroundColor, borderColor: stageColor }
          ]}>
            <MaterialIcons 
              name={
                state === 'completed' ? 'check-circle' : 
                state === 'current' ? stage.icon :
                'radio-button-unchecked'
              } 
              size={compact ? 20 : 24} 
              color={stageColor} 
            />
          </View>

          {/* Stage info */}
          <View style={styles.stageInfo}>
            <Text style={[
              styles.stageLabel,
              { color: stageColor },
              state === 'current' && styles.currentStageLabel
            ]}>
              {stage.label}
            </Text>
            
            {!compact && (
              <Text style={[
                styles.stageDescription,
                { color: state === 'upcoming' ? colors.gray400 : colors.gray600 }
              ]}>
                {stage.description}
              </Text>
            )}

            {/* Status badge for current stage */}
            {state === 'current' && (
              <View style={[styles.currentBadge, { backgroundColor: stageColor }]}>
                <Text style={styles.currentBadgeText}>Current</Text>
              </View>
            )}

            {/* Completion time from order history */}
            {state === 'completed' && orderHistory.length > 0 && (
              (() => {
                const historyItem = orderHistory.find(h => h.new_status === stage.status);
                if (historyItem) {
                  return (
                    <Text style={styles.completionTime}>
                      {new Date(historyItem.updated_at || historyItem.changed_at).toLocaleString()}
                    </Text>
                  );
                }
                return null;
              })()
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderPhaseHeader = (phase, stages) => {
    const phaseStages = stages.filter(s => s.phase === phase);
    const hasCompleted = phaseStages.some(s => getStageState(s) === 'completed');
    const hasCurrent = phaseStages.some(s => getStageState(s) === 'current');
    
    let phaseState = 'upcoming';
    if (hasCompleted && !hasCurrent) phaseState = 'completed';
    else if (hasCurrent || hasCompleted) phaseState = 'active';

    const phaseLabels = {
      preparation: 'Preparation',
      journey: 'Journey',
      loading: 'Loading',
      delivery: 'Delivery',
      completion: 'Completion'
    };

    return (
      <View style={[
        styles.phaseHeader,
        { backgroundColor: PHASE_BACKGROUNDS[phase] }
      ]}>
        <MaterialIcons 
          name={
            phaseState === 'completed' ? 'check-circle' :
            phaseState === 'active' ? 'radio-button-checked' :
            'radio-button-unchecked'
          }
          size={18}
          color={phaseState === 'upcoming' ? colors.gray400 : PHASE_COLORS[phase]}
        />
        <Text style={[
          styles.phaseLabel,
          { color: phaseState === 'upcoming' ? colors.gray400 : PHASE_COLORS[phase] }
        ]}>
          {phaseLabels[phase]}
        </Text>
      </View>
    );
  };

  // Group stages by phase for organized display
  const phases = ['preparation', 'journey', 'loading', 'delivery', 'completion'];
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="timeline" size={24} color={colors.primary} />
        <Text style={styles.title}>Order Progress</Text>
      </View>

      <ScrollView 
        style={styles.timelineContainer}
        showsVerticalScrollIndicator={false}
      >
        {compact ? (
          // Compact horizontal timeline
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.compactTimeline}
          >
            {ORDER_PROGRESSION_STAGES.map((stage, index) => {
              const state = getStageState(stage);
              const stageColor = getStageColor(stage, state);
              
              return (
                <View key={stage.status} style={styles.compactStage}>
                  <View style={[
                    styles.compactIndicator,
                    { 
                      backgroundColor: getStageBackgroundColor(stage, state), 
                      borderColor: stageColor 
                    }
                  ]}>
                    <MaterialIcons 
                      name={
                        state === 'completed' ? 'check-circle' : 
                        state === 'current' ? stage.icon :
                        'radio-button-unchecked'
                      } 
                      size={16} 
                      color={stageColor} 
                    />
                  </View>
                  <Text style={[
                    styles.compactLabel,
                    { color: stageColor }
                  ]}>
                    {stage.label}
                  </Text>
                  
                  {/* Connection line */}
                  {index < ORDER_PROGRESSION_STAGES.length - 1 && (
                    <View style={[
                      styles.compactLine,
                      { backgroundColor: state === 'completed' ? colors.success : colors.gray200 }
                    ]} />
                  )}
                </View>
              );
            })}
          </ScrollView>
        ) : (
          // Full vertical timeline with phases
          <View style={styles.fullTimeline}>
            {phases.map(phase => {
              const phaseStages = ORDER_PROGRESSION_STAGES.filter(s => s.phase === phase);
              if (phaseStages.length === 0) return null;
              
              return (
                <View key={phase} style={styles.phaseSection}>
                  {renderPhaseHeader(phase, ORDER_PROGRESSION_STAGES)}
                  {phaseStages.map((stage, _index) => renderStage(stage, ORDER_PROGRESSION_STAGES.indexOf(stage)))}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
    marginLeft: 8,
  },
  
  timelineContainer: {
    maxHeight: 400,
  },
  
  // Full timeline styles
  fullTimeline: {
    flex: 1,
  },
  
  phaseSection: {
    marginBottom: 16,
  },
  
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  
  phaseLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  stageContainer: {
    marginLeft: 16,
    position: 'relative',
  },
  
  stageContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    position: 'relative',
  },
  
  timelineLine: {
    position: 'absolute',
    left: 15,
    top: 32,
    width: 2,
    height: 50,
    zIndex: 1,
  },
  
  stageIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    zIndex: 2,
  },
  
  stageInfo: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 8,
  },
  
  stageLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  
  currentStageLabel: {
    fontWeight: '700',
  },
  
  stageDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  
  currentBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
  },
  
  currentBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  
  completionTime: {
    fontSize: 11,
    color: colors.gray500,
    fontStyle: 'italic',
    marginTop: 2,
  },
  
  // Compact timeline styles
  compactTimeline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  
  compactStage: {
    alignItems: 'center',
    marginHorizontal: 8,
    position: 'relative',
  },
  
  compactIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  
  compactLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 60,
  },
  
  compactLine: {
    position: 'absolute',
    top: 14,
    left: 28,
    width: 24,
    height: 2,
    zIndex: 1,
  },
});

export default OrderProgressTimeline;
