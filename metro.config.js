const path = require("path");
const fs = require("fs");
const { getDefaultConfig } = require("expo/metro-config");
const {
  getBundleModeMetroConfig,
} = require("react-native-worklets/bundleMode");

const workletsPackageDir = path.resolve(
  __dirname,
  "node_modules/react-native-worklets"
);

let config = getDefaultConfig(__dirname);

config.watchFolders.push(workletsPackageDir);

const workletsDirPath = path.join("react-native-worklets", ".worklets");

const originalExpoResolver = config.resolver.resolveRequest;

config = getBundleModeMetroConfig(config);

const sourceExts = config.resolver.sourceExts || [
  "ts", "tsx", "js", "jsx", "json",
];

function resolveExtensions(basePath) {
  if (path.extname(basePath)) {
    if (fs.existsSync(basePath)) return basePath;
    const dir = path.dirname(basePath);
    const name = path.basename(basePath, path.extname(basePath));
    const ext = path.extname(basePath);
    const nativePath = path.join(dir, name + ".native" + ext);
    if (fs.existsSync(nativePath)) return nativePath;
    return null;
  }
  for (const ext of sourceExts) {
    const nativePath = basePath + ".native." + ext;
    if (fs.existsSync(nativePath)) return nativePath;
    const withExt = basePath + "." + ext;
    if (fs.existsSync(withExt)) return withExt;
  }
  const indexFiles = sourceExts.flatMap((ext) => [
    path.join(basePath, "index.native." + ext),
    path.join(basePath, "index." + ext),
  ]);
  for (const f of indexFiles) {
    if (fs.existsSync(f)) return f;
  }
  return null;
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const originModulePath = context.originModulePath || "";

  if (
    originModulePath.includes(workletsDirPath) &&
    (moduleName.startsWith("../") || moduleName.startsWith("..\\"))
  ) {
    const originDir = path.dirname(path.resolve(originModulePath));
    const resolvedPath = path.resolve(originDir, moduleName);
    const withExt = resolveExtensions(resolvedPath);
    if (withExt && withExt.startsWith(workletsPackageDir)) {
      return { type: "sourceFile", filePath: withExt };
    }
  }

  if (moduleName.startsWith(workletsDirPath)) {
    const fullModuleName = path.join(workletsPackageDir, moduleName.replace('react-native-worklets/', ''));
    if (!fs.existsSync(fullModuleName)) {
    fs.mkdirSync(path.dirname(fullModuleName), { recursive: true });
    fs.writeFileSync(fullModuleName, 'export default function __w() {}');
  }
  if (!fs.existsSync(fullModuleName)) {
    fs.mkdirSync(path.dirname(fullModuleName), { recursive: true });
    fs.writeFileSync(fullModuleName, 'export default function __w() {}');
  }
  return { type: "sourceFile", filePath: fullModuleName };
  }

  if (originalExpoResolver) {
    return originalExpoResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
