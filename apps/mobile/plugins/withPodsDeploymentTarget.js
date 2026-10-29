const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

// Le SDK iOS 27 refuse les pods ciblant une version trop ancienne (SDWebImage, Sentry…) et
// expo-router utilise des API iOS 16 : on aligne tous les pods sur la cible de l'app (16.0,
// cf. expo-build-properties dans app.json) dans le post_install du Podfile.
const MIN = '16.0';
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
