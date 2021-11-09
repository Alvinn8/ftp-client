
/*
* Babel plugin that appends ".js" to imports and resolves react and react-dom
* to skypack urls the browser can understand.
*/

// Pinned skypack urls optimized for production
const REACT_PINNED_URL = "https://cdn.skypack.dev/pin/react@v17.0.1-yH0aYV1FOvoIPeKBbHxg/mode=imports,min/optimized/react.js";
const REACT_DOM_PINNED_URL = "https://cdn.skypack.dev/pin/react-dom@v17.0.1-oZ1BXZ5opQ1DbTh7nu9r/mode=imports,min/optimized/react-dom.js";

module.exports = () => {
    return {
        visitor: {
            ImportDeclaration(path, state) {
                /** @type {string} */
                let importPath = path.node.source.value;
                switch (importPath) {
                    case "react": importPath = REACT_PINNED_URL; break;
                    case "react-dom": importPath = REACT_DOM_PINNED_URL; break;
                }
                if (importPath.startsWith(".")) importPath += ".js";
                path.node.source.value = importPath;
            }
        }
    };
};