Running 'gradlew :app:assembleDebug' in /home/expo/workingdir/build/MyApp/android
Downloading https://services.gradle.org/distributions/gradle-8.14.3-bin.zip
10%.
20%.
30%.
40%.
50%.
60%.
70
%.
80%.
90%.
100%
Welcome to Gradle 8.14.3!
Here are the highlights of this release:
 - Java 24 support
 - GraalVM Native Image toolchain selection
 - Enhancements to test reporting
 - Build Authoring improvements
For more details see https://docs.gradle.org/8.14.3/release-notes.html
To honour the JVM settings for this build a single-use Daemon process will be forked. For more on this, please refer to https://docs.gradle.org/8.14.3/userguide/gradle_daemon.html#sec:disabling_the_daemon in the Gradle documentation.
Daemon will be stopped at the end of the build
> Configure project :expo-gradle-plugin:expo-autolinking-plugin
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-plugin/build.gradle.kts:25:3: 'kotlinOptions(KotlinJvmOptionsDeprecated /* = KotlinJvmOptions */.() -> Unit): Unit' is deprecated. Please migrate to the compilerOptions DSL. More details are here: https://kotl.in/u1r8ln
> Configure project :expo-gradle-plugin:expo-autolinking-settings-plugin
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-settings-plugin/build.gradle.kts:30:3: 'kotlinOptions(KotlinJvmOptionsDeprecated /* = KotlinJvmOptions */.() -> Unit): Unit' is deprecated. Please migrate to the compilerOptions DSL. More details are here: https://kotl.in/u1r8ln
> Task :gradle-plugin:shared:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-gradle-plugin:expo-autolinking-plugin-shared:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :gradle-plugin:settings-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :gradle-plugin:settings-plugin:pluginDescriptors
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:pluginDescriptors
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:processResources
> Task :gradle-plugin:settings-plugin:processResources
> Task :gradle-plugin:shared:processResources NO-SOURCE
> Task :expo-gradle-plugin:expo-autolinking-plugin-shared:processResources NO-SOURCE
> Task :gradle-plugin:shared:compileKotlin
> Task :gradle-plugin:shared:compileJava NO-SOURCE
> Task :gradle-plugin:shared:classes UP-TO-DATE
> Task :gradle-plugin:shared:jar
> Task :expo-gradle-plugin:expo-autolinking-plugin-shared:compileKotlin
> Task :expo-gradle-plugin:expo-autolinking-plugin-shared:compileJava NO-SOURCE
> Task :expo-gradle-plugin:expo-autolinking-plugin-shared:classes UP-TO-DATE
> Task :expo-gradle-plugin:expo-autolinking-plugin-shared:jar
> Task :gradle-plugin:settings-plugin:compileKotlin
> Task :gradle-plugin:settings-plugin:compileJava
NO-SOURCE
> Task :gradle-plugin:settings-plugin:classes
> Task :gradle-plugin:settings-plugin:jar
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:compileKotlin
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:compileJava NO-SOURCE
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:classes
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:jar
> Configure project :expo-dev-launcher-gradle-plugin
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-dev-launcher/expo-dev-launcher-gradle-plugin/build.gradle.kts:25:3: 'kotlinOptions(KotlinJvmOptionsDeprecated /* = KotlinJvmOptions */.() -> Unit): Unit' is deprecated. Please migrate to the compilerOptions DSL. More details are here: https://kotl.in/u1r8ln
> Configure project :expo-module-gradle-plugin
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-modules-core/expo-module-gradle-plugin/build.gradle.kts:58:3: 'kotlinOptions(KotlinJvmOptionsDeprecated /* = KotlinJvmOptions */.() -> Unit): Unit' is deprecated. Please migrate to the compilerOptions DSL. More details are here: https://kotl.in/u1r8ln
> Task :expo-dev-launcher-gradle-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-gradle-plugin:expo-autolinking-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :gradle-plugin:react-native-gradle-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-module-gradle-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-module-gradle-plugin:pluginDescriptors
> Task :expo-dev-launcher-gradle-plugin:pluginDescriptors
> Task :expo-module-gradle-plugin:processResources
> Task :expo-dev-launcher-gradle-plugin:processResources
> Task :expo-gradle-plugin:expo-autolinking-plugin:pluginDescriptors
> Task :expo-gradle-plugin:expo-autolinking-plugin:processResources
> Task :gradle-plugin:react-native-gradle-plugin:pluginDescriptors
> Task :gradle-plugin:react-native-gradle-plugin:processResources
> Task :expo-gradle-plugin:expo-autolinking-plugin:compileKotlin
> Task :expo-gradle-plugin:expo-autolinking-plugin:compileJava NO-SOURCE
> Task :expo-gradle-plugin:expo-autolinking-plugin:classes
> Task :expo-gradle-plugin:expo-autolinking-plugin:jar
> Task :gradle-plugin:react-native-gradle-plugin:compileKotlin
> Task :gradle-plugin:react-native-gradle-plugin:compileJava NO-SOURCE
> Task :gradle-plugin:react-native-gradle-plugin:classes
> Task :gradle-plugin:react-native-gradle-plugin:jar
> Task :expo-dev-launcher-gradle-plugin:compileKotlin
> Task :expo-dev-launcher-gradle-plugin:compileJava NO-SOURCE
> Task :expo-dev-launcher-gradle-plugin:classes
> Task :expo-dev-launcher-gradle-plugin:jar
> Task :expo-module-gradle-plugin:compileKotlin
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-modules-core/expo-module-gradle-plugin/src/main/kotlin/expo/modules/plugin/android/AndroidLibraryExtension.kt:9:24 'var targetSdk: Int?' is deprecated. Will be removed from library DSL in v9.0. Use testOptions.targetSdk or/and lint.targetSdk instead.
> Task :expo-module-gradle-plugin:compileJava NO-SOURCE
> Task :expo-module-gradle-plugin:classes
> Task :expo-module-gradle-plugin:jar
> Configure project :
[ExpoRootProject] Using the following versions:
  - buildTools:  36.0.0
  - minSdk:      24
  - compileSdk:  36
  - targetSdk:   36
  - ndk:         27.1.12297006
  - kotlin:      2.1.20
  - ksp:         2.1.20-2.0.1
> Configure project :app
ℹ️  Applying gradle plugin 'expo-dev-launcher-gradle-plugin'
> Configure project :expo
Using expo modules
  - expo-barcode-scanner (13.0.1)
  - expo-constants (18.0.9)
  - expo-dev-client (6.0.15)
  - expo-dev-launcher (6.0.15)
- expo-dev-menu (7.0.14)
- expo-dev-menu-interface (2.0.0)
- expo-image-loader (4.7.0)
- expo-json-utils (0.15.0)
- expo-manifests (1.0.8)
- expo-modules-core (3.0.21)
- expo-updates-interface (2.0.0)
- [📦] expo-application (7.0.7)
  - [📦] expo-asset (12.0.9)
  - [📦] expo-camera (17.0.8)
  - [📦] expo-device (8.0.9)
  - [📦] expo-file-system (19.0.17)
  - [📦] expo-font (14.0.9)
- [📦] expo-keep-awake (15.0.7)
  - [📦] expo-linking (8.0.8)
  - [📦] expo-location (19.0.7)
Checking the license for package Android SDK Build-Tools 36 in /home/expo/Android/Sdk/licenses
License for package Android SDK Build-Tools 36 accepted.
Preparing "Install Android SDK Build-Tools 36 v.36.0.0".
"Install Android SDK Build-Tools 36 v.36.0.0" ready.
Installing Android SDK Build-Tools 36 in /home/expo/Android/Sdk/build-tools/36.0.0
"Install Android SDK Build-Tools 36 v.36.0.0" complete.
"Install Android SDK Build-Tools 36 v.36.0.0" finished.
[=========                              ] 25%
[=======================================] 100% Fetch remote repository...       
> Task :expo-barcode-scanner:preBuild UP-TO-DATE
> Task :expo-dev-client:preBuild UP-TO-DATE
> Task :expo-dev-launcher:preBuild UP-TO-DATE
> Task :expo-dev-menu:preBuild UP-TO-DATE
> Task :expo-dev-menu-interface:preBuild UP-TO-DATE
> Task :expo-image-loader:preBuild UP-TO-DATE
> Task :expo-json-utils:preBuild UP-TO-DATE
> Task :expo-manifests:preBuild UP-TO-DATE
> Task :expo-modules-core:preBuild UP-TO-DATE
> Task :expo-updates-interface:preBuild UP-TO-DATE
> Task :expo-constants:createExpoConfig
> Task :expo-constants:preBuild
The NODE_ENV environment variable is required but was not specified. Ensure the project is bundled with Expo CLI or NODE_ENV is set. Using only .env.local and .env
> Task :react-native-async-storage_async-storage:generateCodegenSchemaFromJavaScript
> Task :react-native-safe-area-context:generateCodegenSchemaFromJavaScript
> Task :expo:generatePackagesList
> Task :expo:preBuild
> Task :react-native-async-storage_async-storage:generateCodegenArtifactsFromSchema
> Task :react-native-async-storage_async-storage:preBuild
> Task :react-native-safe-area-context:generateCodegenArtifactsFromSchema
> Task :react-native-safe-area-context:preBuild
> Task :expo:preDebugBuild
> Task :sentry_react-native:generateCodegenSchemaFromJavaScript
> Task :react-native-screens:generateCodegenSchemaFromJavaScript
> Task :sentry_react-native:generateCodegenArtifactsFromSchema
> Task :sentry_react-native:preBuild
> Task :expo-barcode-scanner:preDebugBuild UP-TO-DATE
> Task :react-native-screens:generateCodegenArtifactsFromSchema
> Task :react-native-screens:preBuild
> Task :expo-constants:preDebugBuild
> Task :expo-constants:writeDebugAarMetadata
> Task :expo-dev-client:preDebugBuild UP-TO-DATE
> Task :expo-dev-client:writeDebugAarMetadata
> Task :expo-dev-launcher:preDebugBuild UP-TO-DATE
> Task :expo:writeDebugAarMetadata
> Task :expo-barcode-scanner:writeDebugAarMetadata
> Task :expo-dev-menu:preDebugBuild UP-TO-DATE
> Task :expo-dev-launcher:writeDebugAarMetadata
> Task :expo-dev-menu-interface:preDebugBuild UP-TO-DATE
> Task :expo-dev-menu:writeDebugAarMetadata
> Task :expo-image-loader:preDebugBuild UP-TO-DATE
> Task :expo-dev-menu-interface:writeDebugAarMetadata
> Task :expo-json-utils:preDebugBuild UP-TO-DATE
> Task :expo-image-loader:writeDebugAarMetadata
> Task :expo-manifests:preDebugBuild UP-TO-DATE
> Task :expo-json-utils:writeDebugAarMetadata
> Task :expo-modules-core:preDebugBuild UP-TO-DATE
> Task :expo-manifests:writeDebugAarMetadata
> Task :expo-updates-interface:preDebugBuild UP-TO-DATE
> Task :expo-modules-core:writeDebugAarMetadata
> Task :react-native-async-storage_async-storage:preDebugBuild
> Task :react-native-async-storage_async-storage:writeDebugAarMetadata
> Task :react-native-safe-area-context:preDebugBuild
> Task :react-native-safe-area-context:writeDebugAarMetadata
> Task :react-native-screens:preDebugBuild
> Task :expo-updates-interface:writeDebugAarMetadata
> Task :react-native-screens:writeDebugAarMetadata
> Task :sentry_react-native:preDebugBuild
> Task :expo:generateDebugResValues
> Task :sentry_react-native:writeDebugAarMetadata
> Task :expo-barcode-scanner:generateDebugResValues
> Task :expo:generateDebugResources
> Task :expo-barcode-scanner:generateDebugResources
> Task :expo:packageDebugResources
> Task :expo-barcode-scanner:packageDebugResources
> Task :expo-constants:generateDebugResValues
> Task :expo-dev-client:generateDebugResValues
> Task :expo-constants:generateDebugResources
> Task :expo-dev-client:generateDebugResources
> Task :expo-constants:packageDebugResources
> Task :expo-dev-launcher:generateDebugResValues
> Task :expo-dev-launcher:generateDebugResources
> Task :expo-dev-client:packageDebugResources
> Task :expo-dev-menu:generateDebugResValues
> Task :expo-dev-menu:generateDebugResources
> Task :expo-dev-launcher:packageDebugResources
> Task :expo-dev-menu:packageDebugResources
> Task :expo-dev-menu-interface:generateDebugResValues
> Task :expo-image-loader:generateDebugResValues
> Task :expo-dev-menu-interface:generateDebugResources
> Task :expo-image-loader:generateDebugResources
> Task :expo-dev-menu-interface:packageDebugResources
> Task :expo-json-utils:generateDebugResValues
> Task :expo-image-loader:packageDebugResources
> Task :expo-manifests:generateDebugResValues
> Task :expo-json-utils:generateDebugResources
> Task :expo-manifests:generateDebugResources
> Task :expo-manifests:packageDebugResources
> Task :expo-json-utils:packageDebugResources
> Task :expo-modules-core:generateDebugResValues
> Task :expo-updates-interface:generateDebugResValues
> Task :expo-modules-core:generateDebugResources
> Task :expo-updates-interface:generateDebugResources
> Task :expo-modules-core:packageDebugResources
> Task :react-native-async-storage_async-storage:generateDebugResValues
> Task :expo-updates-interface:packageDebugResources
> Task :react-native-safe-area-context:generateDebugResValues
> Task :react-native-async-storage_async-storage:generateDebugResources
> Task :react-native-safe-area-context:generateDebugResources
> Task :react-native-async-storage_async-storage:packageDebugResources
> Task :react-native-safe-area-context:packageDebugResources
> Task :sentry_react-native:generateDebugResValues
> Task :react-native-screens:generateDebugResValues
> Task :sentry_react-native:generateDebugResources
> Task :react-native-screens:generateDebugResources
> Task :sentry_react-native:packageDebugResources
> Task :expo:extractDeepLinksDebug
> Task :react-native-screens:packageDebugResources
> Task :expo-barcode-scanner:extractDeepLinksDebug
> Task :expo:processDebugManifest
> Task :expo-barcode-scanner:processDebugManifest
> Task :expo-constants:extractDeepLinksDebug
> Task :expo-dev-client:extractDeepLinksDebug
> Task :expo-dev-launcher:extractDeepLinksDebug
> Task :expo-constants:processDebugManifest
> Task :expo-dev-client:processDebugManifest
> Task :expo-dev-menu:extractDeepLinksDebug
> Task :expo-dev-menu-interface:extractDeepLinksDebug
> Task :expo-dev-menu-interface:processDebugManifest
> Task :expo-image-loader:extractDeepLinksDebug
> Task :expo-dev-menu:processDebugManifest
> Task :expo-json-utils:extractDeepLinksDebug
> Task :expo-json-utils:processDebugManifest
> Task :expo-manifests:extractDeepLinksDebug
> Task :expo-manifests:processDebugManifest
> Task :expo-modules-core:extractDeepLinksDebug
> Task :expo-image-loader:processDebugManifest
> Task :expo-updates-interface:extractDeepLinksDebug
> Task :expo-dev-launcher:processDebugManifest
> Task :react-native-async-storage_async-storage:extractDeepLinksDebug
> Task :expo-updates-interface:processDebugManifest
> Task :react-native-async-storage_async-storage:processDebugManifest
package="com.reactnativecommunity.asyncstorage" found in source AndroidManifest.xml: /home/expo/workingdir/build/MyApp/node_modules/@react-native-async-storage/async-storage/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="com.reactnativecommunity.asyncstorage" from the source AndroidManifest.xml: /home/expo/workingdir/build/MyApp/node_modules/@react-native-async-storage/async-storage/android/src/main/AndroidManifest.xml.
> Task :react-native-safe-area-context:extractDeepLinksDebug
> Task :expo-modules-core:processDebugManifest
/home/expo/workingdir/build/MyApp/node_modules/expo-modules-core/android/src/main/AndroidManifest.xml:8:9-11:45 Warning:
	meta-data#com.facebook.soloader.enabled@android:value was tagged at AndroidManifest.xml:8 to replace other declarations but no other declaration present
> Task :react-native-screens:extractDeepLinksDebug
> Task :react-native-safe-area-context:processDebugManifest
package="com.th3rdwave.safeareacontext" found in source AndroidManifest.xml: /home/expo/workingdir/build/MyApp/node_modules/react-native-safe-area-context/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="com.th3rdwave.safeareacontext" from the source AndroidManifest.xml: /home/expo/workingdir/build/MyApp/node_modules/react-native-safe-area-context/android/src/main/AndroidManifest.xml.
> Task :sentry_react-native:extractDeepLinksDebug
> Task :react-native-screens:processDebugManifest
> Task :sentry_react-native:processDebugManifest
package="io.sentry.react" found in source AndroidManifest.xml: /home/expo/workingdir/build/MyApp/node_modules/@sentry/react-native/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="io.sentry.react" from the source AndroidManifest.xml: /home/expo/workingdir/build/MyApp/node_modules/@sentry/react-native/android/src/main/AndroidManifest.xml.
> Task :expo-barcode-scanner:compileDebugLibraryResources
> Task :expo:compileDebugLibraryResources
> Task :expo:parseDebugLocalResources
> Task :expo-barcode-scanner:parseDebugLocalResources
> Task :expo:generateDebugRFile
> Task :expo-barcode-scanner:generateDebugRFile
> Task :expo-dev-client:compileDebugLibraryResources
> Task :expo-constants:compileDebugLibraryResources
> Task :expo-dev-client:parseDebugLocalResources
> Task :expo-constants:parseDebugLocalResources
> Task :expo-constants:generateDebugRFile
> Task :expo-dev-launcher:compileDebugLibraryResources
> Task :expo-dev-client:generateDebugRFile
> Task :expo-dev-menu-interface:compileDebugLibraryResources
> Task :expo-dev-menu-interface:parseDebugLocalResources
> Task :expo-dev-launcher:parseDebugLocalResources
> Task :expo-dev-menu:parseDebugLocalResources
> Task :expo-dev-menu:compileDebugLibraryResources
> Task :expo-dev-launcher:generateDebugRFile
> Task :expo-dev-menu:generateDebugRFile
> Task :expo-dev-menu-interface:generateDebugRFile
> Task :expo-manifests:compileDebugLibraryResources
> Task :expo-json-utils:compileDebugLibraryResources
> Task :expo-image-loader:compileDebugLibraryResources
> Task :expo-image-loader:parseDebugLocalResources
> Task :expo-manifests:parseDebugLocalResources
> Task :expo-json-utils:parseDebugLocalResources
> Task :expo-image-loader:generateDebugRFile
> Task :expo-manifests:generateDebugRFile
> Task :expo-json-utils:generateDebugRFile
> Task :expo-modules-core:compileDebugLibraryResources
> Task :expo-updates-interface:compileDebugLibraryResources
> Task :expo-modules-core:parseDebugLocalResources
> Task :expo-modules-core:generateDebugRFile
> Task :expo-updates-interface:parseDebugLocalResources
> Task :expo-updates-interface:generateDebugRFile
> Task :react-native-async-storage_async-storage:parseDebugLocalResources
> Task :react-native-async-storage_async-storage:compileDebugLibraryResources
> Task :react-native-async-storage_async-storage:generateDebugRFile
> Task :react-native-safe-area-context:compileDebugLibraryResources
> Task :react-native-safe-area-context:parseDebugLocalResources
> Task :react-native-screens:parseDebugLocalResources
> Task :react-native-safe-area-context:generateDebugRFile
> Task :sentry_react-native:compileDebugLibraryResources
> Task :sentry_react-native:parseDebugLocalResources
> Task :react-native-screens:generateDebugRFile
> Task :expo:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo:generateDebugBuildConfig
> Task :expo-barcode-scanner:checkKotlinGradlePluginConfigurationErrors
SKIPPED
> Task :expo-barcode-scanner:generateDebugBuildConfig
> Task :expo-modules-core:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :react-native-screens:compileDebugLibraryResources
> Task :sentry_react-native:generateDebugRFile
> Task :expo-modules-core:generateDebugBuildConfig
> Task :expo-constants:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-constants:generateDebugBuildConfig
> Task :expo-barcode-scanner:javaPreCompileDebug
> Task :expo-dev-client:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-constants:javaPreCompileDebug
> Task :expo-dev-launcher:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-dev-client:dataBindingMergeDependencyArtifactsDebug
> Task :app:generateAutolinkingNewArchitectureFiles
> Task :app:generateAutolinkingPackageList
> Task :app:generateCodegenSchemaFromJavaScript SKIPPED
> Task :app:generateCodegenArtifactsFromSchema SKIPPED
> Task :app:generateReactNativeEntryPoint
> Task :app:preBuild
> Task :app:preDebugBuild
> Task :app:mergeDebugNativeDebugMetadata NO-SOURCE
> Task :app:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :app:generateDebugBuildConfig
> Task :expo-modules-core:javaPreCompileDebug
> Task :expo-dev-client:dataBindingGenBaseClassesDebug
> Task :expo-dev-client:generateDebugBuildConfig
> Task :expo-dev-client:javaPreCompileDebug
> Task :expo-dev-menu:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-dev-menu:generateDebugBuildConfig
> Task :expo-dev-menu-interface:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-dev-menu-interface:generateDebugBuildConfig
> Task :expo-dev-menu-interface:javaPreCompileDebug
> Task :expo-json-utils:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-json-utils:generateDebugBuildConfig
> Task :expo-json-utils:javaPreCompileDebug
> Task :expo-manifests:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-manifests:generateDebugBuildConfig
> Task :expo-manifests:javaPreCompileDebug
> Task :expo-dev-menu:javaPreCompileDebug
> Task :expo-updates-interface:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-updates-interface:generateDebugBuildConfig
> Task :expo-updates-interface:javaPreCompileDebug
> Task :expo-image-loader:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-image-loader:generateDebugBuildConfig
> Task :expo-image-loader:javaPreCompileDebug
> Task :expo:javaPreCompileDebug
> Task :react-native-async-storage_async-storage:generateDebugBuildConfig
> Task :react-native-async-storage_async-storage:javaPreCompileDebug
> Task :app:checkDebugAarMetadata
> Task :app:generateDebugResValues
> Task :expo-dev-launcher:dataBindingMergeDependencyArtifactsDebug
> Task :react-native-async-storage_async-storage:compileDebugJavaWithJavac
Note: Some input files use or override a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
Note: /home/expo/workingdir/build/MyApp/node_modules/@react-native-async-storage/async-storage/android/src/javaPackage/java/com/reactnativecommunity/asyncstorage/AsyncStoragePackage.java uses unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
> Task :app:mapDebugSourceSetPaths
> Task :app:generateDebugResources
> Task :app:packageDebugResources
> Task :app:mergeDebugResources
> Task :app:createDebugCompatibleScreenManifests
> Task :app:extractDeepLinksDebug
> Task :app:parseDebugLocalResources
> Task :expo-dev-launcher:dataBindingGenBaseClassesDebug
> Task :expo-dev-launcher:generateDebugBuildConfig
> Task :expo-dev-launcher:checkApolloVersions
> Task :expo-dev-launcher:generateServiceApolloOptions
> Task :react-native-async-storage_async-storage:bundleLibCompileToJarDebug
> Task :react-native-safe-area-context:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :react-native-safe-area-context:generateDebugBuildConfig
> Task :app:processDebugMainManifest
/home/expo/workingdir/build/MyApp/android/app/src/debug/AndroidManifest.xml:6:5-162 Warning:
	application@android:usesCleartextTraffic was tagged at AndroidManifest.xml:6 to replace other declarations but no other declaration present
/home/expo/workingdir/build/MyApp/android/app/src/debug/AndroidManifest.xml Warning:
	provider#expo.modules.filesystem.FileSystemFileProvider@android:authorities was tagged at AndroidManifest.xml:0 to replace other declarations but no other declaration present
> Task :app:processDebugManifest
> Task :app:processDebugManifestForPackage
> Task :expo-dev-launcher:generateServiceApolloSources
w: /home/expo/workingdir/build/MyApp/node_modules/expo-dev-launcher/android/src/main/graphql/GetBranches.graphql: (21, 11): Apollo: Use of deprecated field `runtimeVersion`
w: /home/expo/workingdir/build/MyApp/node_modules/expo-dev-launcher/android/src/main/graphql/GetBranches.graphql: (34, 3): Apollo: Variable `platform` is unused
w: /home/expo/workingdir/build/MyApp/node_modules/expo-dev-launcher/android/src/main/graphql/GetUpdates.graphql: (14, 11): Apollo: Use of deprecated field `runtimeVersion`
> Task :expo-dev-launcher:javaPreCompileDebug
> Task :react-native-safe-area-context:javaPreCompileDebug
> Task :react-native-screens:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :react-native-screens:generateDebugBuildConfig
> Task :react-native-safe-area-context:compileDebugKotlin
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-safe-area-context/android/src/main/java/com/th3rdwave/safeareacontext/SafeAreaView.kt:59:23 'val uiImplementation: UIImplementation!' is deprecated. Deprecated in Java.
> Task :react-native-safe-area-context:compileDebugJavaWithJavac
> Task :react-native-safe-area-context:bundleLibCompileToJarDebug
> Task :react-native-screens:javaPreCompileDebug
> Task :sentry_react-native:generateDebugBuildConfig
> Task :sentry_react-native:javaPreCompileDebug
> Task :app:processDebugResources
> Task :app:javaPreCompileDebug
> Task :app:mergeDebugShaders
> Task :app:compileDebugShaders NO-SOURCE
> Task :app:generateDebugAssets UP-TO-DATE
> Task :expo:mergeDebugShaders
> Task :expo:compileDebugShaders NO-SOURCE
> Task :expo:generateDebugAssets UP-TO-DATE
> Task :expo:mergeDebugAssets
> Task :expo-barcode-scanner:mergeDebugShaders
> Task :expo-barcode-scanner:compileDebugShaders NO-SOURCE
> Task :expo-barcode-scanner:generateDebugAssets UP-TO-DATE
> Task :expo-barcode-scanner:mergeDebugAssets
> Task :expo-constants:mergeDebugShaders
> Task :expo-constants:compileDebugShaders NO-SOURCE
> Task :expo-constants:generateDebugAssets UP-TO-DATE
> Task :expo-constants:mergeDebugAssets
> Task :expo-dev-client:mergeDebugShaders
> Task :expo-dev-client:compileDebugShaders NO-SOURCE
> Task :expo-dev-client:generateDebugAssets UP-TO-DATE
> Task :expo-dev-client:mergeDebugAssets
> Task :expo-dev-launcher:mergeDebugShaders
> Task :expo-dev-launcher:compileDebugShaders NO-SOURCE
> Task :expo-dev-launcher:generateDebugAssets UP-TO-DATE
> Task :expo-dev-launcher:mergeDebugAssets
> Task :expo-dev-menu:mergeDebugShaders
> Task :expo-dev-menu:compileDebugShaders NO-SOURCE
> Task :expo-dev-menu:generateDebugAssets UP-TO-DATE
> Task :expo-dev-menu:mergeDebugAssets
> Task :expo-dev-menu-interface:mergeDebugShaders
> Task :expo-dev-menu-interface:compileDebugShaders NO-SOURCE
> Task :expo-dev-menu-interface:generateDebugAssets UP-TO-DATE
> Task :expo-dev-menu-interface:mergeDebugAssets
> Task :expo-image-loader:mergeDebugShaders
> Task :expo-image-loader:compileDebugShaders NO-SOURCE
> Task :expo-image-loader:generateDebugAssets UP-TO-DATE
> Task :expo-image-loader:mergeDebugAssets
> Task :expo-json-utils:mergeDebugShaders
> Task :expo-json-utils:compileDebugShaders NO-SOURCE
> Task :expo-json-utils:generateDebugAssets UP-TO-DATE
> Task :expo-json-utils:mergeDebugAssets
> Task :expo-manifests:mergeDebugShaders
> Task :expo-manifests:compileDebugShaders NO-SOURCE
> Task :expo-manifests:generateDebugAssets UP-TO-DATE
> Task :expo-manifests:mergeDebugAssets
> Task :expo-modules-core:mergeDebugShaders
> Task :expo-modules-core:compileDebugShaders NO-SOURCE
> Task :expo-modules-core:generateDebugAssets UP-TO-DATE
> Task :expo-modules-core:mergeDebugAssets
> Task :expo-updates-interface:mergeDebugShaders
> Task :expo-updates-interface:compileDebugShaders NO-SOURCE
> Task :expo-updates-interface:generateDebugAssets UP-TO-DATE
> Task :expo-updates-interface:mergeDebugAssets
> Task :react-native-async-storage_async-storage:mergeDebugShaders
> Task :react-native-async-storage_async-storage:compileDebugShaders NO-SOURCE
> Task :react-native-async-storage_async-storage:generateDebugAssets UP-TO-DATE
> Task :react-native-async-storage_async-storage:mergeDebugAssets
> Task :react-native-safe-area-context:mergeDebugShaders
> Task :react-native-safe-area-context:compileDebugShaders NO-SOURCE
> Task :react-native-safe-area-context:generateDebugAssets UP-TO-DATE
> Task :react-native-safe-area-context:mergeDebugAssets
> Task :react-native-screens:mergeDebugShaders
> Task :react-native-screens:compileDebugShaders NO-SOURCE
> Task :react-native-screens:generateDebugAssets UP-TO-DATE
> Task :react-native-screens:mergeDebugAssets
> Task :react-native-safe-area-context:bundleLibRuntimeToJarDebug
> Task :expo-modules-core:compileDebugKotlin
> Task :sentry_react-native:compileDebugJavaWithJavac
> Task :sentry_react-native:bundleLibCompileToJarDebug
> Task :sentry_react-native:mergeDebugShaders
> Task :sentry_react-native:compileDebugShaders NO-SOURCE
> Task :sentry_react-native:generateDebugAssets UP-TO-DATE
> Task :sentry_react-native:mergeDebugAssets
Note: Some input files use or override a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
> Task :app:mergeDebugAssets
> Task :app:compressDebugAssets
> Task :react-native-async-storage_async-storage:bundleLibRuntimeToJarDebug
> Task :sentry_react-native:bundleLibRuntimeToJarDebug
> Task :app:desugarDebugFileDependencies
> Task :react-native-async-storage_async-storage:processDebugJavaRes NO-SOURCE
> Task :react-native-safe-area-context:processDebugJavaRes
> Task :sentry_react-native:processDebugJavaRes NO-SOURCE
> Task :expo:mergeDebugJniLibFolders
> Task :expo:mergeDebugNativeLibs NO-SOURCE
> Task :expo:copyDebugJniLibsProjectOnly
> Task :expo-barcode-scanner:mergeDebugJniLibFolders
> Task :expo-barcode-scanner:mergeDebugNativeLibs NO-SOURCE
> Task :expo-barcode-scanner:copyDebugJniLibsProjectOnly
> Task :expo-constants:mergeDebugJniLibFolders
> Task :app:checkDebugDuplicateClasses
> Task :expo-constants:mergeDebugNativeLibs NO-SOURCE
> Task :expo-constants:copyDebugJniLibsProjectOnly
> Task :expo-dev-client:mergeDebugJniLibFolders
> Task :expo-dev-client:mergeDebugNativeLibs NO-SOURCE
> Task :expo-dev-client:copyDebugJniLibsProjectOnly
> Task :expo-dev-launcher:mergeDebugJniLibFolders
> Task :expo-dev-launcher:mergeDebugNativeLibs NO-SOURCE
> Task :expo-dev-launcher:copyDebugJniLibsProjectOnly
> Task :expo-dev-menu:mergeDebugJniLibFolders
> Task :expo-dev-menu:mergeDebugNativeLibs NO-SOURCE
> Task :expo-dev-menu:copyDebugJniLibsProjectOnly
> Task :expo-dev-menu-interface:mergeDebugJniLibFolders
> Task :expo-dev-menu-interface:mergeDebugNativeLibs NO-SOURCE
> Task :expo-dev-menu-interface:copyDebugJniLibsProjectOnly
> Task :expo-image-loader:mergeDebugJniLibFolders
> Task :expo-image-loader:mergeDebugNativeLibs NO-SOURCE
> Task :expo-image-loader:copyDebugJniLibsProjectOnly
> Task :expo-json-utils:mergeDebugJniLibFolders
> Task :expo-json-utils:mergeDebugNativeLibs NO-SOURCE
> Task :expo-json-utils:copyDebugJniLibsProjectOnly
> Task :expo-manifests:mergeDebugJniLibFolders
> Task :expo-manifests:mergeDebugNativeLibs NO-SOURCE
> Task :expo-manifests:copyDebugJniLibsProjectOnly
> Task :expo-modules-core:compileDebugKotlin
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-modules-core/android/src/main/java/expo/modules/adapters/react/apploader/RNHeadlessAppLoader.kt:48:87 'val reactNativeHost: ReactNativeHost' is deprecated. You should not use ReactNativeHost directly in the New Architecture. Use ReactHost instead.
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-modules-core/android/src/main/java/expo/modules/adapters/react/apploader/RNHeadlessAppLoader.kt:91:85 'val reactNativeHost: ReactNativeHost' is deprecated. You should not use ReactNativeHost directly in the New Architecture. Use ReactHost instead.
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-modules-core/android/src/main/java/expo/modules/adapters/react/apploader/RNHeadlessAppLoader.kt:120:83 'val reactNativeHost: ReactNativeHost' is deprecated. You should not use ReactNativeHost directly in the New Architecture. Use ReactHost instead.
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-modules-core/android/src/main/java/expo/modules/apploader/AppLoaderProvider.kt:34:52 Unchecked cast of 'Class<*>!' to 'Class<out HeadlessAppLoader>'.
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/AppContext.kt:30:8 'typealias ErrorManagerModule = JSLoggerModule' is deprecated. Use JSLoggerModule instead.
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/AppContext.kt:253:21 'typealias ErrorManagerModule = JSLoggerModule' is deprecated. Use JSLoggerModule instead.
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/AppContext.kt:343:21 'val DEFAULT: Int' is deprecated. UIManagerType.DEFAULT will be deleted in the next release of React Native. Use [LEGACY] instead.
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/defaultmodules/NativeModulesProxyModule.kt:16:5 'fun Constants(legacyConstantsProvider: () -> Map<String, Any?>): Unit' is deprecated. Use `Constant` or `Property` instead.
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/jni/PromiseImpl.kt:65:51 'val errorManager: JSLoggerModule?' is deprecated. Use AppContext.jsLogger instead.
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/jni/PromiseImpl.kt:69:22 'fun reportExceptionToLogBox(codedException: CodedException): Unit' is deprecated. Use appContext.jsLogger.error(...) instead.
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/views/ViewDefinitionBuilder.kt:464:16 'val errorManager: JSLoggerModule?' is deprecated. Use AppContext.jsLogger instead.
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/views/ViewDefinitionBuilder.kt:464:30 'fun reportExceptionToLogBox(codedException: CodedException): Unit' is deprecated. Use appContext.jsLogger.error(...) instead.
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/views/ViewManagerDefinition.kt:41:16 'val errorManager: JSLoggerModule?' is deprecated. Use AppContext.jsLogger instead.
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/views/ViewManagerDefinition.kt:41:30 'fun reportExceptionToLogBox(codedException: CodedException): Unit' is deprecated. Use appContext.jsLogger.error(...) instead.
> Task :expo-updates-interface:mergeDebugJniLibFolders
> Task :expo-updates-interface:mergeDebugNativeLibs NO-SOURCE
> Task :expo-updates-interface:copyDebugJniLibsProjectOnly
> Task :react-native-async-storage_async-storage:mergeDebugJniLibFolders
> Task :react-native-async-storage_async-storage:mergeDebugNativeLibs NO-SOURCE
> Task :react-native-async-storage_async-storage:copyDebugJniLibsProjectOnly
> Task :react-native-safe-area-context:mergeDebugJniLibFolders
> Task :react-native-safe-area-context:mergeDebugNativeLibs NO-SOURCE
> Task :react-native-safe-area-context:copyDebugJniLibsProjectOnly
> Task :app:configureCMakeDebug[arm64-v8a]
Checking the license for package CMake 3.22.1 in /home/expo/Android/Sdk/licenses
License for package CMake 3.22.1 accepted.
Preparing "Install CMake 3.22.1 v.3.22.1".
"Install CMake 3.22.1 v.3.22.1" ready.
Installing CMake 3.22.1 in /home/expo/Android/Sdk/cmake/3.22.1
"Install CMake 3.22.1 v.3.22.1" complete.
"Install CMake 3.22.1 v.3.22.1" finished.
> Task :react-native-screens:configureCMakeDebug[arm64-v8a]
> Task :expo-modules-core:configureCMakeDebug[arm64-v8a]
> Task :expo-modules-core:compileDebugJavaWithJavac
Note: Some input files use or override a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
> Task :react-native-screens:buildCMakeDebug[arm64-v8a]
> Task :react-native-screens:compileDebugKotlin
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/RNScreensPackage.kt:56:9 The corresponding parameter in the supertype 'BaseReactPackage' is named 'name'. This may cause problems when calling this function with named arguments.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/RNScreensPackage.kt:57:9 The corresponding parameter in the supertype 'BaseReactPackage' is named 'reactContext'. This may cause problems when calling this function with named arguments.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/RNScreensPackage.kt:70:17 'constructor(name: String, className: String, canOverrideExistingModule: Boolean, needsEagerInit: Boolean, hasConstants: Boolean, isCxxModule: Boolean, isTurboModule: Boolean): ReactModuleInfo' is deprecated. This constructor is deprecated and will be removed in the future. Use ReactModuleInfo(String, String, boolean, boolean, boolean, boolean)].
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/Screen.kt:48:77 Unchecked cast of '(CoordinatorLayout.Behavior<View!>?..CoordinatorLayout.Behavior<*>?)' to 'BottomSheetBehavior<Screen>'.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/Screen.kt:383:36 'fun setTranslucent(screen: Screen, activity: Activity?, context: ReactContext?): Unit' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/Screen.kt:402:36 'fun setColor(screen: Screen, activity: Activity?, context: ReactContext?): Unit' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/Screen.kt:420:36 'fun setNavigationBarColor(screen: Screen, activity: Activity?): Unit' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/Screen.kt:437:36 'fun setNavigationBarTranslucent(screen: Screen, activity: Activity?): Unit' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:217:31 'var targetElevation: Float' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:220:13 'fun setHasOptionsMenu(p0: Boolean): Unit' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:397:18 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:404:22 'fun onPrepareOptionsMenu(p0: Menu): Unit' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:407:18 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:412:22 'fun onCreateOptionsMenu(p0: Menu, p1: MenuInflater): Unit' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackHeaderConfig.kt:435:18 'val reactNativeHost: ReactNativeHost' is deprecated. You should not use ReactNativeHost directly in the New Architecture. Use ReactHost instead.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:203:14 'var statusBarColor: Int?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:220:14 'var isStatusBarTranslucent: Boolean?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:237:14 'var navigationBarColor: Int?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:246:14 'var isNavigationBarTranslucent: Boolean?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:55:42 'fun replaceSystemWindowInsets(p0: Int, p1: Int, p2: Int, p3: Int): WindowInsetsCompat' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:56:39 'val systemWindowInsetLeft: Int' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:58:39 'val systemWindowInsetRight: Int' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:59:39 'val systemWindowInsetBottom: Int' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:102:53 'var statusBarColor: Int' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:106:37 'var statusBarColor: Int?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:113:48 'var statusBarColor: Int' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:116:32 'var statusBarColor: Int' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:162:49 'var isStatusBarTranslucent: Boolean?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:218:43 'var navigationBarColor: Int?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:218:72 'var navigationBarColor: Int' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:224:16 'var navigationBarColor: Int' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:241:55 'var isNavigationBarTranslucent: Boolean?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:283:13 'fun setColor(screen: Screen, activity: Activity?, context: ReactContext?): Unit' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:285:13 'fun setTranslucent(screen: Screen, activity: Activity?, context: ReactContext?): Unit' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:289:13 'fun setNavigationBarColor(screen: Screen, activity: Activity?): Unit' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:290:13 'fun setNavigationBarTranslucent(screen: Screen, activity: Activity?): Unit' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:354:42 'var statusBarColor: Int?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:356:48 'var isStatusBarTranslucent: Boolean?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:359:57 'var navigationBarColor: Int?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:360:63 'var isNavigationBarTranslucent: Boolean?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:7:8 'object ReactFeatureFlags : Any' is deprecated. Use com.facebook.react.internal.featureflags.ReactNativeFeatureFlags instead.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:25:13 'object ReactFeatureFlags : Any' is deprecated. Use com.facebook.react.internal.featureflags.ReactNativeFeatureFlags instead.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:32:9 The corresponding parameter in the supertype 'ReactViewGroup' is named 'left'. This may cause problems when calling this function with named arguments.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:33:9 The corresponding parameter in the supertype 'ReactViewGroup' is named 'top'. This may cause problems when calling this function with named arguments.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:34:9 The corresponding parameter in the supertype 'ReactViewGroup' is named 'right'. This may cause problems when calling this function with named arguments.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:35:9 The corresponding parameter in the supertype 'ReactViewGroup' is named 'bottom'. This may cause problems when calling this function with named arguments.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:71:9 The corresponding parameter in the supertype 'RootView' is named 'childView'. This may cause problems when calling this function with named arguments.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:72:9 The corresponding parameter in the supertype 'RootView' is named 'ev'. This may cause problems when calling this function with named arguments.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:79:46 The corresponding parameter in the supertype 'RootView' is named 'ev'. This may cause problems when calling this function with named arguments.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:83:9 The corresponding parameter in the supertype 'RootView' is named 'childView'. This may cause problems when calling this function with named arguments.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:84:9 The corresponding parameter in the supertype 'RootView' is named 'ev'. This may cause problems when calling this function with named arguments.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:95:34 The corresponding parameter in the supertype 'RootView' is named 't'. This may cause problems when calling this function with named arguments.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/DimmingView.kt:63:9 The corresponding parameter in the supertype 'ReactCompoundView' is named 'touchX'. This may cause problems when calling this function with named arguments.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/DimmingView.kt:64:9 The corresponding parameter in the supertype 'ReactCompoundView' is named 'touchY'. This may cause problems when calling this function with named arguments.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/DimmingView.kt:68:9 The corresponding parameter in the supertype 'ReactCompoundViewGroup' is named 'touchX'. This may cause problems when calling this function with named arguments.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/DimmingView.kt:69:9 The corresponding parameter in the supertype 'ReactCompoundViewGroup' is named 'touchY'. This may cause problems when calling this function with named arguments.
w: file:///home/expo/workingdir/build/MyApp/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/gamma/tabs/TabsHostViewManager.kt:37:9 The corresponding parameter in the supertype 'TabsHostViewManager' is named 'view'. This may cause problems when calling this function with named arguments.
> Task :react-native-screens:configureCMakeDebug[armeabi-v7a]
> Task :react-native-screens:buildCMakeDebug[armeabi-v7a]
> Task :react-native-screens:configureCMakeDebug[x86]
> Task :app:mergeExtDexDebug
> Task :react-native-screens:buildCMakeDebug[x86]
> Task :react-native-screens:configureCMakeDebug[x86_64]
> Task :react-native-screens:buildCMakeDebug[x86_64]
> Task :sentry_react-native:mergeDebugJniLibFolders
> Task :sentry_react-native:mergeDebugNativeLibs NO-SOURCE
> Task :react-native-screens:mergeDebugJniLibFolders
> Task :sentry_react-native:copyDebugJniLibsProjectOnly
> Task :expo-modules-core:bundleLibCompileToJarDebug
> Task :expo-modules-core:bundleLibRuntimeToJarDebug
> Task :react-native-screens:compileDebugJavaWithJavac
> Task :expo-dev-client:compileDebugKotlin NO-SOURCE
> Task :expo-dev-client:compileDebugJavaWithJavac
> Task :expo-dev-client:bundleLibCompileToJarDebug
> Task :expo-constants:compileDebugKotlin
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-constants/android/src/main/java/expo/modules/constants/ConstantsModule.kt:12:5 'fun Constants(legacyConstantsProvider: () -> Map<String, Any?>): Unit' is deprecated. Use `Constant` or `Property` instead.
> Task :expo-dev-menu-interface:compileDebugKotlin
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-dev-menu-interface/android/src/main/java/expo/interfaces/devmenu/DevMenuInterfacePackage.kt:14:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-dev-menu-interface/android/src/main/java/expo/interfaces/devmenu/ReactHostWrapper.kt:5:8 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-dev-menu-interface/android/src/main/java/expo/interfaces/devmenu/ReactHostWrapper.kt:19:41 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-dev-menu-interface/android/src/main/java/expo/interfaces/devmenu/ReactHostWrapper.kt:20:33 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
> Task :expo-constants:compileDebugJavaWithJavac
> Task :expo-constants:bundleLibCompileToJarDebug
> Task :expo-dev-menu-interface:compileDebugJavaWithJavac
> Task :expo-dev-menu-interface:bundleLibCompileToJarDebug
> Task :expo-json-utils:compileDebugKotlin
> Task :expo-json-utils:compileDebugJavaWithJavac
> Task :expo-json-utils:bundleLibCompileToJarDebug
> Task :expo-updates-interface:compileDebugKotlin
> Task :expo-updates-interface:compileDebugJavaWithJavac
> Task :expo-updates-interface:bundleLibCompileToJarDebug
> Task :expo-barcode-scanner:compileDebugKotlin FAILED
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerModule.kt:10:32 Unresolved reference 'barcodescanner'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerModule.kt:77:21 Unresolved reference 'setSettings'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerModule.kt:78:15 Unresolved reference 'BarCodeScannerSettings'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerModule.kt:78:40 Cannot infer type for this parameter. Specify it explicitly.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerModule.kt:78:46 Cannot infer type for this parameter. Specify it explicitly.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerModule.kt:79:17 Unresolved reference 'putTypes'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerModule.kt:84:38 Unresolved reference 'scanMultiple'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerModule.kt:85:49 Unresolved reference 'it'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerModule.kt:86:64 Unresolved reference 'it'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerModule.kt:115:26 Unresolved reference 'BarCodeScannerSettings'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerModule.kt:115:51 Cannot infer type for this parameter. Specify it explicitly.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerModule.kt:115:57 Cannot infer type for this parameter. Specify it explicitly.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerModule.kt:116:13 Unresolved reference 'putTypes'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerProvider.kt:5:32 Unresolved reference 'barcodescanner'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerProvider.kt:6:32 Unresolved reference 'barcodescanner'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerProvider.kt:9:48 Unresolved reference 'BarCodeScannerProviderInterface'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerProvider.kt:10:16 Return type of 'getExportedInterfaces' is not a subtype of the return type of the overridden member 'fun getExportedInterfaces(): (Mutable)List<out (Class<Any!>..Class<*>?)>!' defined in 'expo/modules/core/interfaces/InternalModule'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerProvider.kt:11:5 Cannot infer type for this parameter. Specify it explicitly.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerProvider.kt:11:12 Unresolved reference 'BarCodeScannerProviderInterface'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerProvider.kt:11:12 Argument type mismatch: actual type is 'Class<T#1 (of val <T> KClass<T>.java)>', but 'T#2 (of fun <T> listOf)' was expected.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerProvider.kt:11:51 Cannot infer type for this parameter. Specify it explicitly.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerProvider.kt:11:51 Unresolved reference. None of the following candidates is applicable because of a receiver type mismatch:
val <T> KClass<T>.java: Class<T>
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerProvider.kt:13:3 'createBarCodeDetectorWithContext' overrides nothing.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerProvider.kt:13:68 Unresolved reference 'BarCodeScannerInterface'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:14:32 Unresolved reference 'barcodescanner'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:15:32 Unresolved reference 'barcodescanner'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:65:33 Unresolved reference 'BarCodeScannerResult'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:67:77 Unresolved reference 'cornerPoints'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:67:99 Unresolved reference 'boundingBox'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:71:24 Unresolved reference 'value'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:72:23 Unresolved reference 'raw'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:73:24 Unresolved reference 'type'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:83:71 Unresolved reference 'BarCodeScannerResult'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:84:32 Unresolved reference 'cornerPoints'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:90:35 Unresolved reference 'referenceImageHeight'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:90:58 Cannot infer type for this parameter. Specify it explicitly.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:93:35 Unresolved reference 'referenceImageWidth'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:93:57 Cannot infer type for this parameter. Specify it explicitly.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:97:8 Cannot infer type for this parameter. Specify it explicitly.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:97:50 Unresolved reference 'referenceImageWidth'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:101:8 Cannot infer type for this parameter. Specify it explicitly.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:101:51 Unresolved reference 'referenceImageHeight'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:104:13 Unresolved reference 'referenceImageHeight'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:105:13 Unresolved reference 'referenceImageWidth'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:106:13 Unresolved reference 'cornerPoints'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:111:18 Unresolved reference 'BarCodeScannerResult'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:129:37 Unresolved reference 'x'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:130:37 Unresolved reference 'y'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:136:41 Unresolved reference 'width'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:137:42 Unresolved reference 'height'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerView.kt:150:43 Unresolved reference 'BarCodeScannerSettings'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerViewFinder.kt:12:32 Unresolved reference 'barcodescanner'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerViewFinder.kt:13:32 Unresolved reference 'barcodescanner'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerViewFinder.kt:14:32 Unresolved reference 'barcodescanner'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerViewFinder.kt:44:31 Unresolved reference 'BarCodeScannerInterface'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerViewFinder.kt:166:58 Unresolved reference 'BarCodeScannerProviderInterface'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerViewFinder.kt:167:46 Unresolved reference 'createBarCodeDetectorWithContext'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerViewFinder.kt:177:43 Unresolved reference 'BarCodeScannerSettings'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/BarCodeScannerViewFinder.kt:178:21 Unresolved reference 'setSettings'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/scanners/ExpoBarCodeScanner.kt:4:32 Unresolved reference 'barcodescanner'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/scanners/ExpoBarCodeScanner.kt:5:32 Unresolved reference 'barcodescanner'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/scanners/ExpoBarCodeScanner.kt:7:91 Unresolved reference 'BarCodeScannerInterface'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/scanners/ExpoBarCodeScanner.kt:25:47 Unresolved reference 'BarCodeScannerSettings'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/scanners/ExpoBarCodeScanner.kt:26:42 Unresolved reference 'types'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/scanners/MLKitBarCodeScanner.kt:11:32 Unresolved reference 'barcodescanner'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/scanners/MLKitBarCodeScanner.kt:12:32 Unresolved reference 'barcodescanner'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/scanners/MLKitBarCodeScanner.kt:27:3 'scan' overrides nothing.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/scanners/MLKitBarCodeScanner.kt:30:17 Cannot infer type for this parameter. Specify it explicitly.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/scanners/MLKitBarCodeScanner.kt:30:17 Unresolved reference. None of the following candidates is applicable because of a receiver type mismatch:
fun <T> Collection<T>.isNotEmpty(): Boolean
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/scanners/MLKitBarCodeScanner.kt:36:3 'scanMultiple' overrides nothing.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/scanners/MLKitBarCodeScanner.kt:36:51 Unresolved reference 'BarCodeScannerResult'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/scanners/MLKitBarCodeScanner.kt:41:58 Unresolved reference 'BarCodeScannerResult'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/scanners/MLKitBarCodeScanner.kt:41:82 Cannot infer type for this parameter. Specify it explicitly.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/scanners/MLKitBarCodeScanner.kt:44:35 Unresolved reference 'BarCodeScannerResult'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/scanners/MLKitBarCodeScanner.kt:62:21 Unresolved reference 'BarCodeScannerResult'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/scanners/MLKitBarCodeScanner.kt:67:26 Cannot infer type for this parameter. Specify it explicitly.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/scanners/MLKitBarCodeScanner.kt:67:26 Argument type mismatch: actual type is 'List<T (of fun <T> emptyList)>', but 'MutableList<ERROR CLASS: Cannot infer argument for type parameter T>' was expected.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/scanners/MLKitBarCodeScanner.kt:71:3 'setSettings' overrides nothing.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/scanners/MLKitBarCodeScanner.kt:71:38 Unresolved reference 'BarCodeScannerSettings'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/utils/BarCodeScannerResultSerializer.kt:5:32 Unresolved reference 'barcodescanner'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/utils/BarCodeScannerResultSerializer.kt:6:32 Unresolved reference 'barcodescanner'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/utils/BarCodeScannerResultSerializer.kt:9:24 Unresolved reference 'BarCodeScannerResult'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/utils/BarCodeScannerResultSerializer.kt:11:32 Unresolved reference 'value'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/utils/BarCodeScannerResultSerializer.kt:12:31 Unresolved reference 'raw'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/utils/BarCodeScannerResultSerializer.kt:13:29 Unresolved reference 'type'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/utils/BarCodeScannerResultSerializer.kt:14:77 Unresolved reference 'cornerPoints'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/utils/BarCodeScannerResultSerializer.kt:14:98 Unresolved reference 'boundingBox'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/utils/BarCodeScannerResultSerializer.kt:21:18 Unresolved reference 'BoundingBox'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/utils/BarCodeScannerResultSerializer.kt:32:52 Unresolved reference 'x'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/utils/BarCodeScannerResultSerializer.kt:32:87 Unresolved reference 'y'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/utils/BarCodeScannerResultSerializer.kt:33:49 Unresolved reference 'width'.
e: file:///home/expo/workingdir/build/MyApp/node_modules/expo-barcode-scanner/android/src/main/java/expo/modules/barcodescanner/utils/BarCodeScannerResultSerializer.kt:33:88 Unresolved reference 'height'.
> Task :expo-image-loader:compileDebugKotlin
> Task :expo-manifests:compileDebugKotlin
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-manifests/android/src/main/java/expo/modules/manifests/core/EmbeddedManifest.kt:19:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-manifests/android/src/main/java/expo/modules/manifests/core/EmbeddedManifest.kt:19:86 'fun getLegacyID(): String' is deprecated. Prefer scopeKey or projectId depending on use case.
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-manifests/android/src/main/java/expo/modules/manifests/core/ExpoUpdatesManifest.kt:16:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-manifests/android/src/main/java/expo/modules/manifests/core/Manifest.kt:13:3 Deprecations and opt-ins on a method overridden from 'Any' may not be reported.
w: file:///home/expo/workingdir/build/MyApp/node_modules/expo-manifests/android/src/main/java/expo/modules/manifests/core/Manifest.kt:15:12 'fun getRawJson(): JSONObject' is deprecated. Prefer to use specific field getters.
[Incubating] Problems report is available at: file:///home/expo/workingdir/build/MyApp/android/build/reports/problems/problems-report.html
Deprecated Gradle features were used in this build, making it incompatible with Gradle 9.0.
You can use '--warning-mode all' to show the individual deprecation warnings and determine if they come from your own scripts or plugins.
For more on this, please refer to https://docs.gradle.org/8.14.3/userguide/command_line_interface.html#sec:command_line_warnings in the Gradle documentation.
350 actionable tasks: 350 executed
FAILURE: Build failed with an exception.
* What went wrong:
Execution failed for task ':expo-barcode-scanner:compileDebugKotlin'.
> A failure occurred while executing org.jetbrains.kotlin.compilerRunner.GradleCompilerRunnerWithWorkers$GradleKotlinCompilerWorkAction
   > Compilation error. See log for more details
* Try:
> Run with --stacktrace option to get the stack trace.
> Run with --info or --debug option to get more log output.
> Run with --scan to get full insights.
> Get more help at https://help.gradle.org.
BUILD FAILED in 3m 48s
Error: Gradle build failed with unknown error. See logs for the "Run gradlew" phase for more information.