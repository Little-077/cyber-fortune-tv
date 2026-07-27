// 打包后给 mac 应用打 ad-hoc 签名（无付费证书时，让 Apple 芯片不再报「已损坏」）
exports.default = async function (context) {
  if (context.electronPlatformName !== 'darwin') return;
  const { execSync } = require('child_process');
  const app = `${context.appOutDir}/${context.packager.appInfo.productFilename}.app`;
  execSync(`codesign --force --deep --sign - "${app}"`, { stdio: 'inherit' });
};
