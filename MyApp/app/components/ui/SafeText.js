import React from 'react';
import { Text } from 'react-native';

const SafeText = ({ children, style, numberOfLines, ...props }) => {
  const safeContent = React.useMemo(() => {
    if (children === null || children === undefined) return '';
    if (typeof children === 'object' && children !== null) {
      return JSON.stringify(children);
    }
    return String(children);
  }, [children]);

  return (
    <Text style={style} numberOfLines={numberOfLines} {...props}>
      {safeContent}
    </Text>
  );
};

export default SafeText;
