const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

// Une app compilée avec le SDK iOS 27 (Xcode 27) qui n'adopte pas le cycle de vie « scène » refuse de se
// lancer (« UIScene life cycle is required for apps built with this SDK »). Expo 55 crée encore la fenêtre
// dans l'AppDelegate : on déclare une scène dans l'Info.plist et on déplace le démarrage de React Native
// dans un SceneDelegate (ajouté au même fichier, pour ne pas toucher au projet Xcode).
const MARK = '// thrive: scene lifecycle';

const WINDOW_START = /    window = UIWindow\(frame: UIScreen\.main\.bounds\)\n    factory\.startReactNative\(\n      withModuleName: "main",\n      in: window,\n      launchOptions: launchOptions\)\n/;

const SCENE_DELEGATE = `
${MARK}
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  private var appDelegate: AppDelegate? { UIApplication.shared.delegate as? AppDelegate }

  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    guard let windowScene = scene as? UIWindowScene, let app = appDelegate, let factory = app.reactNativeFactory else { return }
    let window = UIWindow(windowScene: windowScene)
    self.window = window
    app.window = window

    // Ouverture par un lien : on le transmet comme au lancement classique (Linking.getInitialURL).
    var launchOptions = app.launchOptions ?? [:]
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions[.url] = url
    }
    if let activity = connectionOptions.userActivities.first {
      launchOptions[.userActivityDictionary] = [
        "UIApplicationLaunchOptionsUserActivityKey": activity,
        "UIApplicationLaunchOptionsUserActivityTypeKey": activity.activityType,
      ]
    }
    factory.startReactNative(withModuleName: "main", in: window, launchOptions: launchOptions)
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let app = appDelegate else { return }
    for context in URLContexts {
      _ = app.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = appDelegate?.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
`;

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes(MARK)) return cfg;
    if (cfg.modResults.language !== 'swift' || !WINDOW_START.test(src)) {
      throw new Error('withSceneLifecycle : AppDelegate.swift inattendu, le démarrage de React Native est introuvable.');
    }
    src = src.replace(WINDOW_START, '    self.launchOptions = launchOptions\n');
    src = src.replace(
      '  var reactNativeFactory: RCTReactNativeFactory?\n',
      '  var reactNativeFactory: RCTReactNativeFactory?\n  var launchOptions: [UIApplication.LaunchOptionsKey: Any]?\n',
    );
    cfg.modResults.contents = src + SCENE_DELEGATE;
    return cfg;
  });
}

function withSceneManifest(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return cfg;
  });
}

module.exports = function withSceneLifecycle(config) {
  return withSceneManifest(withSceneAppDelegate(config));
};
