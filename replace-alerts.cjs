const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('alert(')) {
        // replace alert("...") or alert('...') or alert(`...`)
        // we have some like alert('Failed to delete order')
        // and alert(err.response?.data?.message || 'Failed')
        // we'll replace the word "alert(" with a matching toast call.
        
        let modified = false;
        
        content = content.replace(/alert\(([\s\S]*?)\)/g, (match, p1) => {
          modified = true;
          if (match.includes('toast.success') || match.includes('toast.error')) return match;
          
          let p1Str = String(p1).toLowerCase();
          
          // Heuristic: if the string literal inside alert contains "success" or "successfully" 
          // and doesn't contain "error" or "failed", it's a success toast.
          if (p1Str.includes('success') && !p1Str.includes('error') && !p1Str.includes('fail')) {
            return `toast.success(${p1})`;
          } else {
            return `toast.error(${p1})`;
          }
        });

        if (modified) {
          if (!content.includes("import toast") && !content.includes("import { toast }")) {
            content = `import toast from 'react-hot-toast';\n` + content;
          }
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log('Updated: ' + fullPath);
        }
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));
console.log('Done!');
