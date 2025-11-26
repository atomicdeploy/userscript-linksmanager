/**
 * Links Manager Userscript - Build Script
 * 
 * Compiles SCSS and bundles all modules into a single userscript file.
 */

const fs = require('fs');
const path = require('path');
const sass = require('sass');

const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log('[Build] Starting build...');

// 1. Compile SCSS
console.log('[Build] Compiling SCSS...');
const scssResult = sass.compile(path.join(srcDir, 'styles', 'main.scss'), {
  style: 'compressed'
});
const cssOutput = scssResult.css;
console.log(`[Build] SCSS compiled (${cssOutput.length} bytes)`);

// 2. Read source files
console.log('[Build] Reading source files...');
const configSrc = fs.readFileSync(path.join(srcDir, 'config.js'), 'utf8');
const apiSrc = fs.readFileSync(path.join(srcDir, 'api.js'), 'utf8');
const iconsSrc = fs.readFileSync(path.join(srcDir, 'icons.js'), 'utf8');
const uiSrc = fs.readFileSync(path.join(srcDir, 'ui.js'), 'utf8');
const mainSrc = fs.readFileSync(path.join(srcDir, 'main.js'), 'utf8');

// 3. Extract module content (remove module.exports and comments about exports)
function extractModuleContent(src, varName) {
  // Remove the module.exports block at the end
  let content = src.replace(/\/\/ Export for use.*?module\.exports.*?\}/s, '');
  content = content.replace(/if \(typeof module.*?module\.exports.*?\}/s, '');
  return content.trim();
}

const configContent = extractModuleContent(configSrc, 'LinksManagerConfig');
const apiContent = extractModuleContent(apiSrc, 'LinksManagerAPI');
const iconsContent = extractModuleContent(iconsSrc, 'LinksManagerIcons');
const uiContent = extractModuleContent(uiSrc, 'LinksManagerUI');

// 4. Build the final userscript
console.log('[Build] Building userscript...');

let output = mainSrc;

// Replace placeholders with actual content
output = output.replace('// __CONFIG_PLACEHOLDER__', configContent);
output = output.replace('// __API_PLACEHOLDER__', apiContent);
output = output.replace('// __ICONS_PLACEHOLDER__', iconsContent);
output = output.replace('// __UI_PLACEHOLDER__', uiContent);

// Escape CSS for embedding in JavaScript string
const escapedCss = cssOutput
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$/g, '\\$');
output = output.replace('__STYLES_PLACEHOLDER__', escapedCss);

// 5. Write output file
const outputPath = path.join(distDir, 'linksmanager.user.js');
fs.writeFileSync(outputPath, output);
console.log(`[Build] Userscript written to ${outputPath} (${output.length} bytes)`);

// 6. Also copy individual files for development
console.log('[Build] Copying development files...');

// Write CSS separately for development
fs.writeFileSync(path.join(distDir, 'linksmanager.css'), scssResult.css);

console.log('[Build] Build complete!');
