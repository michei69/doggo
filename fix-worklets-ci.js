const fs = require("fs");

const metroPath = "metro.config.js";
let config = fs.readFileSync(metroPath, "utf8");

// Fix the double-path bug in the custom resolver.
// moduleName is "react-native-worklets/.worklets/xyz.js" but workletsPackageDir
// is already "node_modules/react-native-worklets", so path.join creates:
//   node_modules/react-native-worklets/react-native-worklets/.worklets/xyz.js (wrong)
// We need to strip the prefix:
//   node_modules/react-native-worklets/.worklets/xyz.js (correct)
config = config.replace(
    "path.join(workletsPackageDir, moduleName)",
    "path.join(workletsPackageDir, moduleName.replace('react-native-worklets/', ''))",
);

// When the .worklets file doesn't exist (clean CI checkout), create a placeholder
// so Metro can resolve and read it. The babel plugin will overwrite it during
// transformation with the real worklet code.
config = config.replace(
    'return { type: "sourceFile", filePath: fullModuleName };',
    `if (!fs.existsSync(fullModuleName)) {
    fs.mkdirSync(path.dirname(fullModuleName), { recursive: true });
    fs.writeFileSync(fullModuleName, 'export default function __w() {}');
  }
  return { type: "sourceFile", filePath: fullModuleName };`,
);

fs.writeFileSync(metroPath, config);
console.log("[worklets-ci] metro.config.js patched");
