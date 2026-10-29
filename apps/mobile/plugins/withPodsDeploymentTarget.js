const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

// Xcode 27 refuse les pods dont la cible iOS est < 15 (SDWebImage, RevenueCat, Sentry…).
// On remonte leur IPHONEOS_DEPLOYMENT_TARGET au minimum de l'app dans le post_install du Podfile.
const MIN = '15.1';
const MARK = '# thrive: pods deployment target';

module.exports = function withPodsDeploymentTarget(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let src = fs.readFileSync(podfile, 'utf8');
      if (!src.includes(MARK)) {
        src = src.replace(
          /post_install do \|installer\|\n/,
          `post_install do |installer|
    ${MARK}
    installer.pods_project.targets.each do |t|
      t.build_configurations.each do |c|
        if c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < ${MIN}
          c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN}'
        end
      end
    end
`,
        );
        fs.writeFileSync(podfile, src);
      }
      return cfg;
    },
  ]);
};
