// 打包后给 mac 应用打 ad-hoc 签名（无付费证书时，让 Apple 芯片不再报「已损坏」）
// 只签最终产物；跳过 universal 合并前的 -temp 分架构目录（否则两份签名不一致会导致合并失败）
exports.default = async function (context) {
  if (context.electronPlatformName !== 'darwin') return;
  if (context.appOutDir.includes('-temp')) return;
  const { execSync } = require('child_process');
  const app = `${context.appOutDir}/${context.packager.appInfo.productFilename}.app`;
  execSync(`codesign --force --deep --sign - "${app}"`, { stdio: 'inherit' });
};
