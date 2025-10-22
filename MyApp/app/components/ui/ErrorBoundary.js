import { MaterialIcons } from '@expo/vector-icons';
import PropTypes from 'prop-types';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const COLORS = {
  white: '#fff',
  text: {
    primary: '#1f2937',
    secondary: '#6b7280',
  },
  error: {
    light: '#fef2f2',
    main: '#dc2626',
    dark: '#7f1d1d',
  },
  primary: '#2563eb',
  transparent: 'transparent',
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    
    // Bind methods in constructor
    this.handleRetry = this.handleRetry.bind(this);
    this.handleGoBack = this.handleGoBack.bind(this);
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
    
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  handleRetry() {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  handleGoBack() {
    if (this.props.onGoBack) {
      this.props.onGoBack();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <MaterialIcons name="error-outline" size={80} color={COLORS.error.main} />
          <Text style={styles.title}>Oops! Something went wrong</Text>
          <Text style={styles.message}>
            {this.props.fallbackMessage || "The component encountered an error. Please try again."}
          </Text>
          
          {__DEV__ && this.state.errorInfo && (
            <View style={styles.errorDetails}>
              <Text style={styles.errorTitle}>Error Details (Development Only):</Text>
              <Text style={styles.errorText}>
                {this.state.error?.toString() || 'Unknown error'}
              </Text>
              <Text style={styles.errorText}>
                {this.state.errorInfo?.componentStack || 'No component stack available'}
              </Text>
            </View>
          )}

          <TouchableOpacity 
            style={styles.retryButton}
            onPress={this.handleRetry}
            accessibilityLabel="Try again"
            accessibilityRole="button"
          >
            <MaterialIcons name="refresh" size={20} color={COLORS.white} />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
          
          {this.props.onGoBack && (
            <TouchableOpacity 
              style={styles.goBackButton}
              onPress={this.handleGoBack}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <MaterialIcons name="arrow-back" size={20} color={COLORS.primary} />
              <Text style={styles.goBackText}>Go Back</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallbackMessage: PropTypes.string,
  onError: PropTypes.func,
  onGoBack: PropTypes.func,
};

ErrorBoundary.defaultProps = {
  fallbackMessage: null,
  onError: null,
  onGoBack: null,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.white,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  errorDetails: {
    backgroundColor: COLORS.error.light,
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.error.main,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error.dark,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  goBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.transparent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  goBackText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ErrorBoundary;
