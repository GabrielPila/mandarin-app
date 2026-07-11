const fs = require('fs');
const path = require('path');

const baseDir = '/Users/gabrielpila/ClaudeProjects/MandarinApp/extraction';
let output = '';

function processDir(dirName, prefix) {
    const dirPath = path.join(baseDir, dirName);
    if (!fs.existsSync(dirPath)) return;
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md')).sort();
    
    for (const file of files) {
        const content = fs.readFileSync(path.join(dirPath, file), 'utf8');
        const lessonMatch = file.match(/L(\d+)/);
        const lessonNum = lessonMatch ? parseInt(lessonMatch[1], 10) : file;
        
        const grammarMatch = content.match(/## Gramática\n([\s\S]*?)(?=\n## |$)/);
        if (grammarMatch) {
            output += `\n========== ${prefix} Lesson ${lessonNum} ==========\n`;
            output += grammarMatch[1].trim() + '\n';
        }
    }
}

processDir('book1_lessons', 'Book 1');
processDir('book2_lessons', 'Book 2');

fs.writeFileSync('/Users/gabrielpila/ClaudeProjects/MandarinApp/sandbox/grammar-aggregated.txt', output);
console.log('Done!');
