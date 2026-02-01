import { reportError, getDomPath } from "../error";

// Google Translate modified the DOM in a way that mismatches with React's
// virtual DOM. Use this workaround from the GitHub issue.
// https://github.com/facebook/react/issues/11538#issuecomment-417504600
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function(child) {
    if (child.parentNode !== this) {
      if (console) {
        console.error('Cannot remove a child from a different parent', child, this);
        reportError(new Error('Cannot remove a child from a different parent. child = ' + getDomPath(child)), 'DOM manipulation error');
      }
      return child;
    }
    return originalRemoveChild.apply(this, arguments);
  }

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function(newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (console) {
        console.error('Cannot insert before a reference node from a different parent', referenceNode, this);
        reportError(new Error('Cannot insert before a reference node from a different parent. referenceNode = ' + getDomPath(referenceNode)), 'DOM manipulation error');
      }
      return newNode;
    }
    return originalInsertBefore.apply(this, arguments);
  }
}
