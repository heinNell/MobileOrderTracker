// fix-build.js
const fs = require('fs');
const path = require('path');

// Path to the autolinking cmake file
const autolinkingPath = '/workspaces/MobileOrderTracker/MyApp/android/app/build/generated/autolinking/src/main/jni/Android-autolinking.cmake';

// Check if file exists
if (fs.existsSync(autolinkingPath)) {
  // Read the file content
  let content = fs.readFileSync(autolinkingPath, 'utf8');
  
  // Comment out problematic lines
  content = content.replace(
    /add_subdirectory\("\/workspaces\/MobileOrderTracker\/MyApp\/node_modules\/@react-native-async-storage\/async-storage\/android\/build\/generated\/source\/codegen\/jni\/"/g, 
    '# add_subdirectory("/workspaces/MobileOrderTracker/MyApp/node_modules/@react-native-async-storage/async-storage/android/build/generated/source/codegen/jni/"'
  );
  
  content = content.replace(
    /add_subdirectory\("\/workspaces\/MobileOrderTracker\/MyApp\/node_modules\/@sentry\/react-native\/android\/build\/generated\/source\/codegen\/jni\/"/g, 
    '# add_subdirectory("/workspaces/MobileOrderTracker/MyApp/node_modules/@sentry/react-native/android/build/generated/source/codegen/jni/"'
  );
  
  // Write the modified content back
  fs.writeFileSync(autolinkingPath, content);
  console.log('Successfully modified autolinking cmake file');
} else {
  console.log('Autolinking cmake file not found');
}
