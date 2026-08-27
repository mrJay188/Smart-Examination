import fs from 'fs';
import path from 'path';

const API_VAR = "(import.meta.env.VITE_API_URL || 'http://localhost:5000')";
const API_VAR_TEMPLATE = "${import.meta.env.VITE_API_URL || 'http://localhost:5000'}";

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      // Replace template literals: `http://localhost:5000/api...` -> `${API_VAR_TEMPLATE}/api...`
      if (content.includes('`http://localhost:5000')) {
        content = content.replace(/`http:\/\/localhost:5000/g, '`' + API_VAR_TEMPLATE);
        modified = true;
      }
      
      // Replace string literals: 'http://localhost:5000/api...' -> API_VAR + '/api...'
      if (content.includes("'http://localhost:5000")) {
        content = content.replace(/'http:\/\/localhost:5000([^']*)'/g, API_VAR + " + '$1'");
        modified = true;
      }

      if (content.includes('"http://localhost:5000')) {
        content = content.replace(/"http:\/\/localhost:5000([^"]*)"/g, API_VAR + ' + "$1"');
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

replaceInDir('./frontend/src');
console.log("Refactoring complete!");
