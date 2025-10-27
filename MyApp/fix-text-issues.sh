#!/bin/bash
# fix-text-issues.sh

echo "🔧 Applying fixes for Text rendering issues..."

# Create SafeText component if it doesn't exist
if [ ! -f "app/components/ui/SafeText.js" ]; then
  mkdir -p app/components/ui
  cat > app/components/ui/SafeText.js << 'EOF'
import React from 'react';
import { Text } from 'react-native';

const SafeText = ({ children, style, fallback = '', numberOfLines, ...props }) => {
  const safeContent = React.useMemo(() => {
    if (children === null || children === undefined) {
      return fallback;
    }
    if (typeof children === 'object' && children !== null) {
      try {
        return JSON.stringify(children);
      } catch {
        return fallback || '[Object]';
      }
    }
    return String(children);
  }, [children, fallback]);

  return (
    <Text style={style} numberOfLines={numberOfLines} {...props}>
      {safeContent}
    </Text>
  );
};

export default SafeText;
EOF
  echo "✅ Created SafeText component"
fi

# Function to replace Text with SafeText
replace_text() {
  local file="$1"
  local pattern="$2"
  local replacement="$3"
  if [[ -f "$file" ]]; then
    sed -i.bak "s|$pattern|$replacement|g" "$file"
    echo "✅ Fixed $file"
  fi
}

# Import SafeText in files (add at the top after other imports if not already present)
add_import() {
  local file="$1"
  if [[ -f "$file" ]] && ! grep -q "SafeText" "$file"; then
    sed -i.bak "2i\\
import SafeText from '../components/ui/SafeText';\\
" "$file"
    echo "✅ Added SafeText import to $file"
  fi
}

# Apply fixes for each file with Text issues
files=(
  "app/components/map/WebMapView.js"
  "app/components/ui/QuickStatCard.js"
  "app/components/ui/StatusIndicators.js"
  "app/components/ui/InfoRow.js"
  "app/components/order/TimelineItem.js"
  "app/(tabs)/LoadActivationScreen.js"
  "app/(tabs)/[orderId].js"
  "app/(tabs)/profile.js"
  "app/(tabs)/orders.js"
  "app/screens/LocationDiagnosticScreen.js"
)

for file in "${files[@]}"; do
  add_import "$file"
done

# Specific replacements
replace_text "app/components/map/WebMapView.js" \
  "<Text>{title}</Text>" \
  "<SafeText fallback=\"Map View\">{title}</SafeText>"

replace_text "app/components/ui/QuickStatCard.js" \
  "<Text style={styles.quickStatLabel}>{label}</Text>" \
  "<SafeText style={styles.quickStatLabel} fallback=\"\">{label}</SafeText>"

replace_text "app/components/ui/QuickStatCard.js" \
  "<Text style={styles.quickStatValue} numberOfLines={1}>{value}</Text>" \
  "<SafeText style={styles.quickStatValue} numberOfLines={1} fallback=\"0\">{value}</SafeText>"

replace_text "app/components/ui/StatusIndicators.js" \
  "<Text style={[styles.badgeText, textStyle]}>{text}</Text>" \
  "<SafeText style={[styles.badgeText, textStyle]} fallback=\"\">{text}</SafeText>"

replace_text "app/components/ui/InfoRow.js" \
  "<Text style={styles.infoLabel}>{label}</Text>" \
  "<SafeText style={styles.infoLabel} fallback=\"\">{label}</SafeText>"

replace_text "app/components/ui/InfoRow.js" \
  "<Text style={styles.infoValue} numberOfLines={3}>{value}</Text>" \
  "<SafeText style={styles.infoValue} numberOfLines={3} fallback=\"N/A\">{value}</SafeText>"

replace_text "app/components/order/TimelineItem.js" \
  "<Text style={[styles.timelineLabel, isCompleted && styles.timelineLabelCompleted]}>{label}</Text>" \
  "<SafeText style={[styles.timelineLabel, isCompleted && styles.timelineLabelCompleted]} fallback=\"\">{label}</SafeText>"

replace_text "app/components/order/TimelineItem.js" \
  "<Text style={[styles.timelineValue, !isCompleted && styles.timelineValuePending]}>{value}</Text>" \
  "<SafeText style={[styles.timelineValue, !isCompleted && styles.timelineValuePending]} fallback=\"\">{value}</SafeText>"

replace_text "app/(tabs)/LoadActivationScreen.js" \
  "<Text style={styles.errorText}>{paramError}</Text>" \
  "<SafeText style={styles.errorText} fallback=\"Unknown error\">{paramError}</SafeText>"

# Handle multiple replacements in [orderId].js
replace_text "app/(tabs)/[orderId].js" \
  "<Text style={styles.infoLabel}>{label}</Text>" \
  "<SafeText style={styles.infoLabel} fallback=\"\">{label}</SafeText>"

replace_text "app/(tabs)/[orderId].js" \
  "<Text style={styles.quickStatLabel}>{label}</Text>" \
  "<SafeText style={styles.quickStatLabel} fallback=\"\">{label}</SafeText>"

replace_text "app/(tabs)/[orderId].js" \
  "<Text style={styles.errorText}>{error}</Text>" \
  "<SafeText style={styles.errorText} fallback=\"Unknown error\">{error}</SafeText>"

replace_text "app/(tabs)/[orderId].js" \
  "<Text style={styles.statusText}>{order.status.toUpperCase()}</Text>" \
  "<SafeText style={styles.statusText} fallback=\"UNKNOWN\">{order?.status?.toUpperCase()}</SafeText>"

replace_text "app/(tabs)/[orderId].js" \
  "<Text style={styles.errorText}>{mapError}</Text>" \
  "<SafeText style={styles.errorText} fallback=\"Map error\">{mapError}</SafeText>"

replace_text "app/(tabs)/[orderId].js" \
  "<Text style={styles.infoAlertText}>{locationError}</Text>" \
  "<SafeText style={styles.infoAlertText} fallback=\"Location error\">{locationError}</SafeText>"

replace_text "app/(tabs)/[orderId].js" \
  "{directionsError && <Text style={styles.errorText}>{directionsError}</Text>}" \
  "{directionsError && <SafeText style={styles.errorText} fallback=\"Directions error\">{directionsError}</SafeText>}"

replace_text "app/(tabs)/[orderId].js" \
  "<Text style={styles.stepInstruction}>{step.html_instructions.replace(/<[^>]*>/g, '')}</Text>" \
  "<SafeText style={styles.stepInstruction} fallback=\"\">{step?.html_instructions?.replace(/<[^>]*>/g, '')}</SafeText>"

replace_text "app/(tabs)/profile.js" \
  "<Text style={styles.infoValue}>{user.email}</Text>" \
  "<SafeText style={styles.infoValue} fallback=\"No email\">{user?.email}</SafeText>"

replace_text "app/(tabs)/orders.js" \
  "<Text style={styles.statusText}>{item.status.toUpperCase()}</Text>" \
  "<SafeText style={styles.statusText} fallback=\"UNKNOWN\">{item?.status?.toUpperCase()}</SafeText>"

replace_text "app/(tabs)/orders.js" \
  "<Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>" \
  "<SafeText style={styles.dateText} fallback=\"No date\">{item?.created_at ? new Date(item.created_at).toLocaleDateString() : 'No date'}</SafeText>"

replace_text "app/(tabs)/orders.js" \
  "<Text style={styles.errorText}>{error}</Text>" \
  "<SafeText style={styles.errorText} fallback=\"Unknown error\">{error}</SafeText>"

replace_text "app/screens/LocationDiagnosticScreen.js" \
  "<Text style={styles.orderNumber}>{order.order_number}</Text>" \
  "<SafeText style={styles.orderNumber} fallback=\"No order number\">{order?.order_number}</SafeText>"

echo "🎉 All Text rendering fixes applied!"
echo "📝 Backup files created with .bak extension"
echo "🧪 Please test your app to ensure everything works correctly"
