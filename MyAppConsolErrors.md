AppEntry.bundle?plat…hermes-stable:79495 [Reanimated] Reduced motion setting is enabled on this device. This warning is visible only in the development mode. Some animations will be disabled by default. You can override the behavior for individual animations, see https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#reduced-motion-setting-is-enabled-on-this-device.
logToConsole	@	AppEntry.bundle?plat…hermes-stable:79495
handleLog	@	AppEntry.bundle?plat…hermes-stable:79612
warn	@	AppEntry.bundle?plat…hermes-stable:79649
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:84928
loadModuleImplementation	@	AppEntry.bundle?plat…e=hermes-stable:254
guardedLoadModule	@	AppEntry.bundle?plat…e=hermes-stable:166
metroRequire	@	AppEntry.bundle?plat…le=hermes-stable:79
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:84694
loadModuleImplementation	@	AppEntry.bundle?plat…e=hermes-stable:254
guardedLoadModule	@	AppEntry.bundle?plat…e=hermes-stable:166
metroRequire	@	AppEntry.bundle?plat…le=hermes-stable:79
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:84671
loadModuleImplementation	@	AppEntry.bundle?plat…e=hermes-stable:254
guardedLoadModule	@	AppEntry.bundle?plat…e=hermes-stable:166
metroRequire	@	AppEntry.bundle?plat…le=hermes-stable:79
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:84374
loadModuleImplementation	@	AppEntry.bundle?plat…e=hermes-stable:254
guardedLoadModule	@	AppEntry.bundle?plat…e=hermes-stable:166
metroRequire	@	AppEntry.bundle?plat…le=hermes-stable:79
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:84096
loadModuleImplementation	@	AppEntry.bundle?plat…e=hermes-stable:254
guardedLoadModule	@	AppEntry.bundle?plat…e=hermes-stable:166
metroRequire	@	AppEntry.bundle?plat…le=hermes-stable:79
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:84030
loadModuleImplementation	@	AppEntry.bundle?plat…e=hermes-stable:254
guardedLoadModule	@	AppEntry.bundle?plat…e=hermes-stable:166
metroRequire	@	AppEntry.bundle?plat…le=hermes-stable:79
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:84015
loadModuleImplementation	@	AppEntry.bundle?plat…e=hermes-stable:254
guardedLoadModule	@	AppEntry.bundle?plat…e=hermes-stable:166
metroRequire	@	AppEntry.bundle?plat…le=hermes-stable:79
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:83936
loadModuleImplementation	@	AppEntry.bundle?plat…e=hermes-stable:254
guardedLoadModule	@	AppEntry.bundle?plat…e=hermes-stable:166
metroRequire	@	AppEntry.bundle?plat…le=hermes-stable:79
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:83908
loadModuleImplementation	@	AppEntry.bundle?plat…e=hermes-stable:254
guardedLoadModule	@	AppEntry.bundle?plat…e=hermes-stable:166
metroRequire	@	AppEntry.bundle?plat…le=hermes-stable:79
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:75408
loadModuleImplementation	@	AppEntry.bundle?plat…e=hermes-stable:254
guardedLoadModule	@	AppEntry.bundle?plat…e=hermes-stable:166
metroRequire	@	AppEntry.bundle?plat…le=hermes-stable:79
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:74282
loadModuleImplementation	@	AppEntry.bundle?plat…e=hermes-stable:254
guardedLoadModule	@	AppEntry.bundle?plat…e=hermes-stable:166
metroRequire	@	AppEntry.bundle?plat…le=hermes-stable:79
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:73624
loadModuleImplementation	@	AppEntry.bundle?plat…e=hermes-stable:254
guardedLoadModule	@	AppEntry.bundle?plat…e=hermes-stable:166
metroRequire	@	AppEntry.bundle?plat…le=hermes-stable:79
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:73507
loadModuleImplementation	@	AppEntry.bundle?plat…e=hermes-stable:254
guardedLoadModule	@	AppEntry.bundle?plat…e=hermes-stable:166
metroRequire	@	AppEntry.bundle?plat…le=hermes-stable:79
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:61773
loadModuleImplementation	@	AppEntry.bundle?plat…e=hermes-stable:254
guardedLoadModule	@	AppEntry.bundle?plat…e=hermes-stable:166
metroRequire	@	AppEntry.bundle?plat…le=hermes-stable:79
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:24584
loadModuleImplementation	@	AppEntry.bundle?plat…e=hermes-stable:254
guardedLoadModule	@	AppEntry.bundle?plat…e=hermes-stable:166
metroRequire	@	AppEntry.bundle?plat…le=hermes-stable:79
(anonymous)	@	AppEntry.bundle?plat…e=hermes-stable:684
loadModuleImplementation	@	AppEntry.bundle?plat…e=hermes-stable:254
guardedLoadModule	@	AppEntry.bundle?plat…e=hermes-stable:159
metroRequire	@	AppEntry.bundle?plat…le=hermes-stable:79
(anonymous)	@	AppEntry.bundle?plat…ermes-stable:203916
Explanation

Understanding the problem
This is a warning from the React Native Reanimated library. It's informing you that the "Reduced motion" accessibility setting is enabled on the device you are currently using for development. This setting is a system-level preference that users can enable to reduce the amount of animation and motion in the operating system and applications, which can be helpful for users with motion sensitivities [5]. When enabled, Reanimated will automatically disable some animations by default to respect this setting [1, 2].

How to verify
You can verify if the reduced motion setting is enabled on your device through your operating system's accessibility settings. The exact location varies depending on your device and OS.

Suggested fix
This is generally safe to ignore in development mode, as it's just a notification that Reanimated is respecting the user's accessibility preference [3]. Your app's animations will be disabled or altered for users with this setting enabled.

If you want to disable this specific warning in development, you can add the following line to your project's root file:

js

import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  '[Reanimated] Reduced motion setting is enabled on this device.',
]);

Use code snippets with caution

If you need to control the animation behavior more specifically when reduced motion is enabled, you can configure individual animations using the reduceMotion option [1] or use the useReducedMotion hook [4] to conditionally render or apply styles.

Summary
The "[Reanimated] Reduced motion setting is enabled on this device." warning indicates that Reanimated is responding to the system's accessibility setting by disabling some animations. This is expected behavior when the setting is active. You can ignore this warning in development or suppress it using LogBox.ignoreLogs.

Sources and related content
Data used to understand this message
Use search instead
AI tools may generate inaccurate info that doesn't represent Google's views. Data sent to Google may be seen by human reviewers to improve this feature. Open settings or learn more



AppEntry.bundle?plat…hermes-stable:23293 "shadow*" style props are deprecated. Use "boxShadow".
Explanation

Understanding the problem
The warning message ""shadow*" style props are deprecated. Use "boxShadow"." indicates that you are using style properties starting with "shadow" (e.g., shadowColor, shadowOffset, shadowOpacity, shadowRadius) in your React Native code, which are being phased out. The recommended replacement for these properties is the boxShadow style property [1].

Suggested fix
Replace the deprecated shadow* style properties with the boxShadow property.

js

// Before:
const styles = StyleSheet.create({
  myElement: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5, // Keep elevation for Android compatibility
  },
});

// After:
const styles = StyleSheet.create({
  myElement: {
    boxShadow: '0 2px 4px rgba(0,0,0,0.25)', // Equivalent boxShadow
    elevation: 5, // Keep elevation for Android compatibility
  },
});

Use code snippets with caution

Note that the syntax for boxShadow is different from the individual shadow* properties. It's a single string value that combines offset, blur radius, color, and spread (though spread is not supported by the equivalent native APIs in React Native [1]). You may need to adjust the values to achieve the desired visual effect. Also, keep the elevation property if you need shadow effects on Android [1].

Summary
The warning indicates the use of deprecated shadow* style properties in React Native. To fix this, replace them with the boxShadow style property, adjusting the syntax and values accordingly. Remember to keep elevation for Android compatibility.

Sources and related content
Data used to understand this message
Use search instead
AI tools may generate inaccurate info that doesn't represent Google's views. Data sent to Google may be seen by human reviewers to improve this feature. Open settings or learn more



AppEntry.bundle?plat…=hermes-stable:4108 Running application "main" with appParams:
 
{rootTag: '#root', hydrate: undefined}
 
Development-level warnings: ON.
Performance optimizations: OFF.
AppEntry.bundle?plat…ermes-stable:168325 🔐 Auth event: SIGNED_IN
AppEntry.bundle?plat…hermes-stable:23293 props.pointerEvents is deprecated. Use style.pointerEvents
warnOnce	@	AppEntry.bundle?plat…hermes-stable:23293
createDOMProps	@	AppEntry.bundle?plat…hermes-stable:36629
createElement	@	AppEntry.bundle?plat…hermes-stable:35606
View	@	AppEntry.bundle?plat…hermes-stable:41173
react-stack-bottom-frame	@	AppEntry.bundle?plat…hermes-stable:17674
renderWithHooks	@	AppEntry.bundle?plat…=hermes-stable:7884
updateForwardRef	@	AppEntry.bundle?plat…=hermes-stable:9485
beginWork	@	AppEntry.bundle?plat…hermes-stable:10237
runWithFiberInDEV	@	AppEntry.bundle?plat…=hermes-stable:5656
performUnitOfWork	@	AppEntry.bundle?plat…hermes-stable:12236
workLoopSync	@	AppEntry.bundle?plat…hermes-stable:12129
renderRootSync	@	AppEntry.bundle?plat…hermes-stable:12113
performWorkOnRoot	@	AppEntry.bundle?plat…hermes-stable:11853
performWorkOnRootViaSchedulerTask	@	AppEntry.bundle?plat…hermes-stable:12833
performWorkUntilDeadline	@	AppEntry.bundle?plat…hermes-stable:18481
Explanation

Understanding the problem
The warning "props.pointerEvents is deprecated. Use style.pointerEvents" indicates that you are using the pointerEvents prop directly on a React Native component to control how the element responds to pointer events [1]. React Native for Web has deprecated this prop and now expects pointerEvents to be a style property instead [2].

Suggested fix
Change props.pointerEvents to style.pointerEvents.

js

/**
   * A simple function that prints a warning message once per session.
   *
   * @param {string} key - The key used to ensure the message is printed once.
   *                       This should be unique to the callsite.
   * @param {string} message - The message to print
   */
  function warnOnce(key, message) {
    if (process.env.NODE_ENV !== 'production') {
      if (warnedKeys[key]) {
        return;
      }
      // Changed to use style.pointerEvents
      console.warn(message.replace('props.pointerEvents', 'style.pointerEvents'));
      warnedKeys[key] = true;
    }
  }

Use code snippets with caution

Summary
The pointerEvents prop is deprecated in React Native for Web. It should now be included within the style object instead.

Sources and related content
Data used to understand this message
Use search instead
AI tools may generate inaccurate info that doesn't represent Google's views. Data sent to Google may be seen by human reviewers to improve this feature. Open settings or learn more



AppEntry.bundle?plat…ermes-stable:168354 ✅ User authenticated: nikkiekriel@gmail.com
AppEntry.bundle?plat…ermes-stable:168325 🔐 Auth event: INITIAL_SESSION
AppEntry.bundle?plat…hermes-stable:42224 [Violation] Added non-passive event listener to a scroll-blocking 'wheel' event. Consider marking event handler as 'passive' to make the page more responsive. See https://www.chromestatus.com/feature/5745543795965952
setupWebWheelHandler	@	AppEntry.bundle?plat…hermes-stable:42224
componentDidMount	@	AppEntry.bundle?plat…hermes-stable:42201
react-stack-bottom-frame	@	AppEntry.bundle?plat…hermes-stable:17696
runWithFiberInDEV	@	AppEntry.bundle?plat…=hermes-stable:5656
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10998
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10997
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11032
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11032
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11032
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11032
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11032
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11032
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10997
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11032
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11032
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10997
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11032
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11032
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10997
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11032
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11032
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10997
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11032
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11032
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11069
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11032
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11032
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:11032
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
commitLayoutEffectOnFiber	@	AppEntry.bundle?plat…hermes-stable:10993
recursivelyTraverseLayoutEffects	@	AppEntry.bundle?plat…hermes-stable:11461
AppEntry.bundle?plat…ermes-stable:168325 🔐 Auth event: SIGNED_IN
AppEntry.bundle?plat…hermes-stable:26285 The action 'NAVIGATE' with payload {"name":"QRScannerScreen","params":{"orderId":"8e073540-40ee-4750-a640-c84d7e46625f"}} was not handled by any navigator.

Do you have a screen named 'QRScannerScreen'?

If you're trying to navigate to a screen in a nested navigator, see https://reactnavigation.org/docs/nesting-navigators#navigating-to-a-screen-in-a-nested-navigator.

If you're using conditional rendering, navigation will happen automatically and you shouldn't navigate manually, see.

This is a development-only warning and won't be shown in production.
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:26285
latestCallback	@	AppEntry.bundle?plat…hermes-stable:27632
dispatch	@	AppEntry.bundle?plat…hermes-stable:33193
dispatch	@	AppEntry.bundle?plat…hermes-stable:32889
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:32917
withStack	@	AppEntry.bundle?plat…hermes-stable:32903
acc.<computed>	@	AppEntry.bundle?plat…hermes-stable:32915
onPress	@	AppEntry.bundle?plat…ermes-stable:120507
onClick	@	AppEntry.bundle?plat…hermes-stable:55487
executeDispatch	@	AppEntry.bundle?plat…hermes-stable:12913
runWithFiberInDEV	@	AppEntry.bundle?plat…=hermes-stable:5656
processDispatchQueue	@	AppEntry.bundle?plat…hermes-stable:12941
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:13234
batchedUpdates$1	@	AppEntry.bundle?plat…=hermes-stable:6504
dispatchEventForPluginEventSystem	@	AppEntry.bundle?plat…hermes-stable:13017
dispatchEvent	@	AppEntry.bundle?plat…hermes-stable:15116
dispatchDiscreteEvent	@	AppEntry.bundle?plat…hermes-stable:15098
Explanation

Understanding the problem
The warning message "The action 'NAVIGATE' with payload... was not handled by any navigator" indicates that React Navigation attempted to navigate to a screen named "QRScannerScreen" but could not find a screen with that name within the current navigator configuration. This usually means the screen name is misspelled, the screen hasn't been added to the navigator, or the navigation action is being called from a context where the target screen is not accessible (e.g., trying to navigate to a screen in a different, unrelated navigator). [2]

Suggested fix
Ensure that a screen named QRScannerScreen is defined within the navigator where you are attempting to navigate. This involves two main steps:

Import the screen component: Make sure you have imported the QRScannerScreen component.
Add the screen to the navigator: Define a Stack.Screen, Tab.Screen, or equivalent within your navigator configuration with the name prop set to "QRScannerScreen" and the component prop set to the imported screen component.
Here's an example for a Stack.Navigator:

js

import { createStackNavigator } from '@react-navigation/stack';
import QRScannerScreen from './QRScannerScreen'; // Make sure the path is correct

const Stack = createStackNavigator();

function MyStackNavigator() {
  return (
    <Stack.Navigator>
      {/* Other screens */}
      <Stack.Screen name="QRScannerScreen" component={QRScannerScreen} />
      {/* More screens */}
    </Stack.Navigator>
  );
}
Use code snippets with caution

If QRScannerScreen is in a nested navigator, ensure you are navigating correctly using the nesting documentation mentioned in the warning message.

Summary
The warning "The action 'NAVIGATE' ... was not handled by any navigator" means React Navigation couldn't find a screen with the specified name (QRScannerScreen). To fix this, verify that the screen name is spelled correctly and that the screen component is properly registered within the relevant navigator. If using nested navigators, ensure your navigation call accounts for the nesting structure.

Sources and related content
Data used to understand this message
Use search instead
AI tools may generate inaccurate info that doesn't represent Google's views. Data sent to Google may be seen by human reviewers to improve this feature. Open settings or learn more



AppEntry.bundle?plat…hermes-stable:26285 The action 'NAVIGATE' with payload {"name":"QRScannerScreen","params":{"orderId":"8e073540-40ee-4750-a640-c84d7e46625f"}} was not handled by any navigator.

Do you have a screen named 'QRScannerScreen'?

If you're trying to navigate to a screen in a nested navigator, see https://reactnavigation.org/docs/nesting-navigators#navigating-to-a-screen-in-a-nested-navigator.

If you're using conditional rendering, navigation will happen automatically and you shouldn't navigate manually, see.

This is a development-only warning and won't be shown in production.
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:26285
latestCallback	@	AppEntry.bundle?plat…hermes-stable:27632
dispatch	@	AppEntry.bundle?plat…hermes-stable:33193
dispatch	@	AppEntry.bundle?plat…hermes-stable:32889
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:32917
withStack	@	AppEntry.bundle?plat…hermes-stable:32903
acc.<computed>	@	AppEntry.bundle?plat…hermes-stable:32915
onPress	@	AppEntry.bundle?plat…ermes-stable:120507
onClick	@	AppEntry.bundle?plat…hermes-stable:55487
executeDispatch	@	AppEntry.bundle?plat…hermes-stable:12913
runWithFiberInDEV	@	AppEntry.bundle?plat…=hermes-stable:5656
processDispatchQueue	@	AppEntry.bundle?plat…hermes-stable:12941
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:13234
batchedUpdates$1	@	AppEntry.bundle?plat…=hermes-stable:6504
dispatchEventForPluginEventSystem	@	AppEntry.bundle?plat…hermes-stable:13017
dispatchEvent	@	AppEntry.bundle?plat…hermes-stable:15116
dispatchDiscreteEvent	@	AppEntry.bundle?plat…hermes-stable:15098
Explanation

Understanding the problem
The warning message "The action 'NAVIGATE' with payload... was not handled by any navigator" indicates that React Navigation attempted to navigate to a screen named "QRScannerScreen" but could not find a screen with that name within the current navigator configuration. This usually means the screen name is misspelled, the screen hasn't been added to the navigator, or the navigation action is being called from a context where the target screen is not accessible (e.g., trying to navigate to a screen in a different, unrelated navigator). [2]

Suggested fix
Ensure that a screen named QRScannerScreen is defined within the navigator where you are attempting to navigate. This involves two main steps:

Import the screen component: Make sure you have imported the QRScannerScreen component.
Add the screen to the navigator: Define a Stack.Screen, Tab.Screen, or equivalent within your navigator configuration with the name prop set to "QRScannerScreen" and the component prop set to the imported screen component.
Here's an example for a Stack.Navigator:

js

import { createStackNavigator } from '@react-navigation/stack';
import QRScannerScreen from './QRScannerScreen'; // Make sure the path is correct

const Stack = createStackNavigator();

function MyStackNavigator() {
  return (
    <Stack.Navigator>
      {/* Other screens */}
      <Stack.Screen name="QRScannerScreen" component={QRScannerScreen} />
      {/* More screens */}
    </Stack.Navigator>
  );
}
Use code snippets with caution

If QRScannerScreen is in a nested navigator, ensure you are navigating correctly using the nesting documentation mentioned in the warning message.

Summary
The warning "The action 'NAVIGATE' ... was not handled by any navigator" means React Navigation couldn't find a screen with the specified name (QRScannerScreen). To fix this, verify that the screen name is spelled correctly and that the screen component is properly registered within the relevant navigator. If using nested navigators, ensure your navigation call accounts for the nesting structure.

Sources and related content
Data used to understand this message
Use search instead
AI tools may generate inaccurate info that doesn't represent Google's views. Data sent to Google may be seen by human reviewers to improve this feature. Open settings or learn more



AppEntry.bundle?plat…=hermes-stable:1683 Disconnected from Metro (1006: "").

To reconnect:
- Ensure that Metro is running and available on the same network
- Reload this app (will trigger further help if Metro cannot be connected to)
      
setHMRUnavailableReason	@	AppEntry.bundle?plat…=hermes-stable:1683
(anonymous)	@	AppEntry.bundle?plat…=hermes-stable:1655
emit	@	AppEntry.bundle?plat…=hermes-stable:1974
HMRClient._ws.onclose	@	AppEntry.bundle?plat…=hermes-stable:1771
Explanation

Understanding the problem
The console message "Disconnected from Metro (1006: "")" indicates that the client (likely a web browser or mobile emulator running your React Native app) has lost its connection to the Metro bundler. Metro is the JavaScript bundler for React Native. It compiles your JavaScript code and serves it to your device or emulator. The "1006" is a standard WebSocket close code indicating that the connection was closed abnormally (without a close frame).

This disconnection means that features relying on the connection to Metro, such as Fast Refresh (Hot Module Replacement), will not work. This is usually due to a network issue or Metro not running or being inaccessible from the client.

How to verify
You can verify this by checking if the Metro bundler is still running in your terminal. If you've closed the terminal where you started Metro or if the process crashed, this error would appear. Also, check your network connection to ensure the client can reach the machine running Metro.

Suggested fix
Ensure Metro is running: If Metro is not running, restart it from your project's root directory using the appropriate command (e.g., npx react-native start for React Native projects).
Check network connectivity: Make sure the device or emulator running your app is on the same network as the machine running Metro. If you're using an emulator, ensure it has network access. For physical devices, confirm they are on the same Wi-Fi network. You might need to adjust firewall settings or network configurations if they are blocking the connection.
Reload the app: After ensuring Metro is running and network connectivity is good, reload your app.
Summary
The "Disconnected from Metro" error means your app lost its connection to the Metro bundler, preventing features like Fast Refresh from working. The solution involves ensuring Metro is running and accessible on the same network as your device or emulator, then reloading the app.

Sources and related content
Data used to understand this message
Use search instead
AI tools may generate inaccurate info that doesn't represent Google's views. Data sent to Google may be seen by human reviewers to improve this feature. Open settings or learn more


import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  '[Reanimated] Reduced motion setting is enabled on this device.',
]);


If you need to control the animation behavior more specifically when reduced motion is enabled, you can configure individual animations using the reduceMotion option [1] or use the useReducedMotion hook [4] to conditionally render or apply styles.

Summary
The "[Reanimated] Reduced motion setting is enabled on this device." warning indicates that Reanimated is responding to the system's accessibility setting by disabling some animations. This is expected behavior when the setting is active. You can ignore this warning in development or suppress it using LogBox.ignoreLogs.


[Reanimated] Reduced motion setting is enabled on this device. This warning is visible only in the development mode. Some animations will be disabled by default. You can override the behavior for individual animations, see https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#reduced-motion-setting-is-enabled-on-this-device.


logToConsole @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:79495
handleLog @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:79612
warn @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:79649
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:84928
loadModuleImplementation @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:254
guardedLoadModule @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfil


  const logToConsole = function logToConsole_reactNativeReanimated_loggerJs1Factory({
    _worklet_4332161666293_init_data,
    ReanimatedLogLevel
  }) {
    const _e = [new global.Error(), -2, -27];
    const logToConsole = function (data) {
      switch (data.level) {
        case ReanimatedLogLevel.warn:
          console.warn(data.message);
          break;
        case ReanimatedLogLevel.error:
          console.error(data.message);
          break;
      }
    };
    logToConsole.__closure = {
      ReanimatedLogLevel
    };
    logToConsole.__workletHash = 4332161666293;
    logToConsole.__pluginVersion = "0.5.1";
    logToConsole.__initData = _worklet_4332161666293_init_data;
    logToConsole.__stackDetails = _e;
    return logToConsole;
  }({
    _worklet_4332161666293_init_data,
    ReanimatedLogLevel
  });
  const DEFAULT_LOGGER_CONFIG = {
    logFunction: logToConsole,
    level: ReanimatedLogLevel.warn,
    strict: true
  };


  2.


  AppEntry.bundle?plat…hermes-stable:26285 The action 'NAVIGATE' with payload {"name":"QRScannerScreen","params":{"orderId":"8e073540-40ee-4750-a640-c84d7e46625f"}} was not handled by any navigator.

Do you have a screen named 'QRScannerScreen'?

If you're trying to navigate to a screen in a nested navigator, see https://reactnavigation.org/docs/nesting-navigators#navigating-to-a-screen-in-a-nested-navigator.

If you're using conditional rendering, navigation will happen automatically and you shouldn't navigate manually, see.

This is a development-only warning and won't be shown in production.
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:26285
latestCallback	@	AppEntry.bundle?plat…hermes-stable:27632
dispatch	@	AppEntry.bundle?plat…hermes-stable:33193
dispatch	@	AppEntry.bundle?plat…hermes-stable:32889
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:32917
withStack	@	AppEntry.bundle?plat…hermes-stable:32903
acc.<computed>	@	AppEntry.bundle?plat…hermes-stable:32915
onPress	@	AppEntry.bundle?plat…ermes-stable:120507
onClick	@	AppEntry.bundle?plat…hermes-stable:55487
executeDispatch	@	AppEntry.bundle?plat…hermes-stable:12913
runWithFiberInDEV	@	AppEntry.bundle?plat…=hermes-stable:5656
processDispatchQueue	@	AppEntry.bundle?plat…hermes-stable:12941
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:13234
batchedUpdates$1	@	AppEntry.bundle?plat…=hermes-stable:6504
dispatchEventForPluginEventSystem	@	AppEntry.bundle?plat…hermes-stable:13017
dispatchEvent	@	AppEntry.bundle?plat…hermes-stable:15116
dispatchDiscreteEvent	@	AppEntry.bundle?plat…hermes-stable:15098
Explanation

Understanding the problem
The warning message "The action 'NAVIGATE' with payload... was not handled by any navigator" indicates that React Navigation attempted to navigate to a screen named "QRScannerScreen" but could not find a screen with that name within the current navigator configuration. This usually means the screen name is misspelled, the screen hasn't been added to the navigator, or the navigation action is being called from a context where the target screen is not accessible (e.g., trying to navigate to a screen in a different, unrelated navigator). [2]

Suggested fix
Ensure that a screen named QRScannerScreen is defined within the navigator where you are attempting to navigate. This involves two main steps:

Import the screen component: Make sure you have imported the QRScannerScreen component.
Add the screen to the navigator: Define a Stack.Screen, Tab.Screen, or equivalent within your navigator configuration with the name prop set to "QRScannerScreen" and the component prop set to the imported screen component.
Here's an example for a Stack.Navigator:

import { createStackNavigator } from '@react-navigation/stack';
import QRScannerScreen from './QRScannerScreen'; // Make sure the path is correct

const Stack = createStackNavigator();

function MyStackNavigator() {
  return (
    <Stack.Navigator>
      {/* Other screens */}
      <Stack.Screen name="QRScannerScreen" component={QRScannerScreen} />
      {/* More screens */}
    </Stack.Navigator>
  );
}

If QRScannerScreen is in a nested navigator, ensure you are navigating correctly using the nesting documentation mentioned in the warning message.

Summary
The warning "The action 'NAVIGATE' ... was not handled by any navigator" means React Navigation couldn't find a screen with the specified name (QRScannerScreen). To fix this, verify that the screen name is spelled correctly and that the screen component is properly registered within the relevant navigator. If using nested navigators, ensure your navigation call accounts for the nesting structure.

The action 'NAVIGATE' with payload {"name":"QRScannerScreen","params":{"orderId":"8e073540-40ee-4750-a640-c84d7e46625f"}} was not handled by any navigator.

Do you have a screen named 'QRScannerScreen'?

If you're trying to navigate to a screen in a nested navigator, see https://reactnavigation.org/docs/nesting-navigators#navigating-to-a-screen-in-a-nested-navigator.

If you're using conditional rendering, navigation will happen automatically and you shouldn't navigate manually, see.

This is a development-only warning and won't be shown in production.

(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:26285
latestCallback @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:27632
dispatch @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:33193
dispatch @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:32889
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:32917
withStack @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:32903



      console.error(message);AppEntry.bundle?plat…hermes-stable:26285 The action 'NAVIGATE' with payload {"name":"QRScannerScreen","params":{"orderId":"8e073540-40ee-4750-a640-c84d7e46625f"}} was not handled by any navigator.

Do you have a screen named 'QRScannerScreen'?

If you're trying to navigate to a screen in a nested navigator, see https://reactnavigation.org/docs/nesting-navigators#navigating-to-a-screen-in-a-nested-navigator.

If you're using conditional rendering, navigation will happen automatically and you shouldn't navigate manually, see.

This is a development-only warning and won't be shown in production.
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:26285
latestCallback	@	AppEntry.bundle?plat…hermes-stable:27632
dispatch	@	AppEntry.bundle?plat…hermes-stable:33193
dispatch	@	AppEntry.bundle?plat…hermes-stable:32889
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:32917
withStack	@	AppEntry.bundle?plat…hermes-stable:32903
acc.<computed>	@	AppEntry.bundle?plat…hermes-stable:32915
onPress	@	AppEntry.bundle?plat…ermes-stable:120507
onClick	@	AppEntry.bundle?plat…hermes-stable:55487
executeDispatch	@	AppEntry.bundle?plat…hermes-stable:12913
runWithFiberInDEV	@	AppEntry.bundle?plat…=hermes-stable:5656
processDispatchQueue	@	AppEntry.bundle?plat…hermes-stable:12941
(anonymous)	@	AppEntry.bundle?plat…hermes-stable:13234
batchedUpdates$1	@	AppEntry.bundle?plat…=hermes-stable:6504
dispatchEventForPluginEventSystem	@	AppEntry.bundle?plat…hermes-stable:13017
dispatchEvent	@	AppEntry.bundle?plat…hermes-stable:15116
dispatchDiscreteEvent	@	AppEntry.bundle?plat…hermes-stable:15098
Explanation

Understanding the problem
The warning message "The action 'NAVIGATE' with payload... was not handled by any navigator" indicates that React Navigation attempted to navigate to a screen named "QRScannerScreen" but could not find a screen with that name within the current navigator configuration. This usually means the screen name is misspelled, the screen hasn't been added to the navigator, or the navigation action is being called from a context where the target screen is not accessible (e.g., trying to navigate to a screen in a different, unrelated navigator). [2]

Suggested fix
Ensure that a screen named QRScannerScreen is defined within the navigator where you are attempting to navigate. This involves two main steps:

Import the screen component: Make sure you have imported the QRScannerScreen component.
Add the screen to the navigator: Define a Stack.Screen, Tab.Screen, or equivalent within your navigator configuration with the name prop set to "QRScannerScreen" and the component prop set to the imported screen component.
Here's an example for a Stack.Navigator:

js

import { createStackNavigator } from '@react-navigation/stack';
import QRScannerScreen from './QRScannerScreen'; // Make sure the path is correct

const Stack = createStackNavigator();

function MyStackNavigator() {
  return (
    <Stack.Navigator>
      {/* Other screens */}
      <Stack.Screen name="QRScannerScreen" component={QRScannerScreen} />
      {/* More screens */}
    </Stack.Navigator>
  );
}
Use code snippets with caution

If QRScannerScreen is in a nested navigator, ensure you are navigating correctly using the nesting documentation mentioned in the warning message.

Summary
The warning "The action 'NAVIGATE' ... was not handled by any navigator" means React Navigation couldn't find a screen with the specified name (QRScannerScreen). To fix this, verify that the screen name is spelled correctly and that the scree07:36:03.094 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:18389 Download the React DevTools for a better development experience: https://react.dev/link/react-devtools
07:36:03.152 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:79495 [Reanimated] Reduced motion setting is enabled on this device. This warning is visible only in the development mode. Some animations will be disabled by default. You can override the behavior for individual animations, see https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#reduced-motion-setting-is-enabled-on-this-device.
logToConsole @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:79495
handleLog @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:79612
warn @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:79649
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:84928
loadModuleImplementation @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:254
guardedLoadModule @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:166
metroRequire @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:79
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:84694
loadModuleImplementation @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:254
guardedLoadModule @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:166
metroRequire @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:79
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:84671
loadModuleImplementation @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:254
guardedLoadModule @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:166
metroRequire @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:79
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:84374
loadModuleImplementation @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:254
guardedLoadModule @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:166
metroRequire @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:79
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:84096
loadModuleImplementation @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:254
guardedLoadModule @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:166
metroRequire @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:79
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:84030
loadModuleImplementation @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:254
guardedLoadModule @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:166
metroRequire @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:79
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:84015
loadModuleImplementation @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:254
guardedLoadModule @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:166
metroRequire @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:79
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:83936
loadModuleImplementation @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:254
guardedLoadModule @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:166
metroRequire @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:79
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:83908
loadModuleImplementation @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:254
guardedLoadModule @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:166
metroRequire @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:79
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:75408
loadModuleImplementation @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:254
guardedLoadModule @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:166
metroRequire @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:79
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:74282
loadModuleImplementation @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:254
guardedLoadModule @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:166
metroRequire @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:79
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:73624
loadModuleImplementation @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:254
guardedLoadModule @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:166
metroRequire @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:79
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:73507
loadModuleImplementation @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:254
guardedLoadModule @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:166
metroRequire @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:79
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:61773
loadModuleImplementation @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:254
guardedLoadModule @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:166
metroRequire @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:79
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:24584
loadModuleImplementation @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:254
guardedLoadModule @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:166
metroRequire @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:79
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:684
loadModuleImplementation @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:254
guardedLoadModule @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:159
metroRequire @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:79
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:203916
07:36:03.218 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:23293 "shadow*" style props are deprecated. Use "boxShadow".
warnOnce @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:23293
preprocess @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:23185
compileAndInsertAtomic @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:20140
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:20183
create @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:20171
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:120787
loadModuleImplementation @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:254
guardedLoadModule @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:166
metroRequire @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:79
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:24585
loadModuleImplementation @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:254
guardedLoadModule @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:166
metroRequire @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:79
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:684
loadModuleImplementation @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:254
guardedLoadModule @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:159
metroRequire @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:79
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:203916
07:36:03.256 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:4108 Running application "main" with appParams:
 {rootTag: '#root', hydrate: undefined} 
Development-level warnings: ON.
Performance optimizations: OFF.
07:36:06.343 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:168325 🔐 Auth event: SIGNED_IN
07:36:06.401 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:23293 props.pointerEvents is deprecated. Use style.pointerEvents
warnOnce @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:23293
createDOMProps @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:36629
createElement @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:35606
View @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:41173
react-stack-bottom-frame @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:17674
renderWithHooks @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:7884
updateForwardRef @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:9485
beginWork @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10237
runWithFiberInDEV @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:5656
performUnitOfWork @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:12236
workLoopSync @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:12129
renderRootSync @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:12113
performWorkOnRoot @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11853
performWorkOnRootViaSchedulerTask @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:12833
performWorkUntilDeadline @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:18481
07:36:07.059 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:168354 ✅ User authenticated: nikkiekriel@gmail.com
07:36:07.531 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:168325 🔐 Auth event: INITIAL_SESSION
07:36:12.060 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:42224 [Violation] Added non-passive event listener to a scroll-blocking 'wheel' event. Consider marking event handler as 'passive' to make the page more responsive. See https://www.chromestatus.com/feature/5745543795965952
setupWebWheelHandler @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:42224
componentDidMount @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:42201
react-stack-bottom-frame @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:17696
runWithFiberInDEV @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:5656
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10998
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10997
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11032
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11032
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11032
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11032
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11032
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11032
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10997
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11032
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11032
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10997
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11032
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11032
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10997
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11032
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11032
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10997
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11032
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11032
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11069
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11032
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11032
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11032
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
commitLayoutEffectOnFiber @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:10993
recursivelyTraverseLayoutEffects @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:11461
07:37:10.998 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:168325 🔐 Auth event: SIGNED_IN
07:37:12.333 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:26285 The action 'NAVIGATE' with payload {"name":"QRScannerScreen","params":{"orderId":"8e073540-40ee-4750-a640-c84d7e46625f"}} was not handled by any navigator.

Do you have a screen named 'QRScannerScreen'?

If you're trying to navigate to a screen in a nested navigator, see https://reactnavigation.org/docs/nesting-navigators#navigating-to-a-screen-in-a-nested-navigator.

If you're using conditional rendering, navigation will happen automatically and you shouldn't navigate manually, see.

This is a development-only warning and won't be shown in production.
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:26285
latestCallback @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:27632
dispatch @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:33193
dispatch @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:32889
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:32917
withStack @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:32903
acc.<computed> @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:32915
onPress @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:120507
onClick @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:55487
executeDispatch @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:12913
runWithFiberInDEV @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:5656
processDispatchQueue @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:12941
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:13234
batchedUpdates$1 @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:6504
dispatchEventForPluginEventSystem @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:13017
dispatchEvent @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:15116
dispatchDiscreteEvent @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:15098
07:37:22.285 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:26285 The action 'NAVIGATE' with payload {"name":"QRScannerScreen","params":{"orderId":"8e073540-40ee-4750-a640-c84d7e46625f"}} was not handled by any navigator.

Do you have a screen named 'QRScannerScreen'?

If you're trying to navigate to a screen in a nested navigator, see https://reactnavigation.org/docs/nesting-navigators#navigating-to-a-screen-in-a-nested-navigator.

If you're using conditional rendering, navigation will happen automatically and you shouldn't navigate manually, see.

This is a development-only warning and won't be shown in production.
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:26285
latestCallback @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:27632
dispatch @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:33193
dispatch @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:32889
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:32917
withStack @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:32903
acc.<computed> @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:32915
onPress @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:120507
onClick @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:55487
executeDispatch @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:12913
runWithFiberInDEV @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:5656
processDispatchQueue @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:12941
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:13234
batchedUpdates$1 @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:6504
dispatchEventForPluginEventSystem @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:13017
dispatchEvent @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:15116
dispatchDiscreteEvent @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:15098
07:37:46.959 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:1683 Disconnected from Metro (1006: "").

To reconnect:
- Ensure that Metro is running and available on the same network
- Reload this app (will trigger further help if Metro cannot be connected to)
      
setHMRUnavailableReason @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:1683
(anonymous) @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:1655
emit @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:1974
HMRClient._ws.onclose @ AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:1771
07:38:56.434 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:168325 🔐 Auth event: SIGNED_IN
07:39:01.499 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:168325 🔐 Auth event: SIGNED_IN
07:39:32.988 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:168325 🔐 Auth event: SIGNED_IN
07:43:26.881 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:168325 🔐 Auth event: SIGNED_IN
07:43:35.739 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:168325 🔐 Auth event: SIGNED_IN
07:43:55.573 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:168325 🔐 Auth event: SIGNED_IN
07:45:20.816 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:168325 🔐 Auth event: SIGNED_IN
07:46:24.460 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:168325 🔐 Auth event: SIGNED_IN
07:46:34.104 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:168325 🔐 Auth event: SIGNED_IN
07:47:19.582 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:168325 🔐 Auth event: SIGNED_IN
07:48:47.158 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:168325 🔐 Auth event: SIGNED_IN
07:49:30.107 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:168325 🔐 Auth event: SIGNED_IN
07:49:39.423 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:168325 🔐 Auth event: SIGNED_IN
07:49:50.879 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:168325 🔐 Auth event: SIGNED_IN
07:50:37.636 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:168325 🔐 Auth event: SIGNED_IN
07:52:05.813 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:168325 🔐 Auth event: SIGNED_IN
07:52:12.794 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:168325 🔐 Auth event: SIGNED_IN
07:52:38.531 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:168325 🔐 Auth event: SIGNED_IN
07:53:07.013 AppEntry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:168325 🔐 Auth event: SIGNED_IN