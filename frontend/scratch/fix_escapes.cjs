const fs = require('fs');
const path = require('path');

const srcDir = path.resolve('c:/Users/Nisarg/Desktop/CNP_2.0/CNP_Department/frontend/src');

function fixTemplateLiterals(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const fullPath = path.join(dir, f);
    if (fs.statSync(fullPath).isDirectory()) {
      fixTemplateLiterals(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Fix \` to `
      content = content.replace(/\\`/g, '`');
      
      // Fix \${ to ${
      content = content.replace(/\\\${/g, '${');

      fs.writeFileSync(fullPath, content);
    }
  }
}

fixTemplateLiterals(srcDir);
console.log('Fixed template literal escaping in TSX files');
