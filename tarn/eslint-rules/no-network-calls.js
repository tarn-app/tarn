/**
 * ESLint rule to prevent network calls in Tarn
 *
 * This app is designed for complete offline operation with zero network calls.
 * No analytics, no crash reporting, no telemetry, no update checks.
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow network-related APIs for offline-first security',
      category: 'Security',
    },
    messages: {
      noFetch: 'Network calls are forbidden. Tarn is offline-only for security.',
      noXHR: 'XMLHttpRequest is forbidden. Tarn is offline-only for security.',
      noWebSocket: 'WebSocket is forbidden. Tarn is offline-only for security.',
      noAxios: 'axios is forbidden. Tarn is offline-only for security.',
      noNetworkImport: 'Importing network libraries is forbidden. Tarn is offline-only for security.',
    },
    schema: [],
  },

  create(context) {
    const forbiddenGlobals = ['fetch', 'XMLHttpRequest', 'WebSocket'];
    const forbiddenImports = ['axios', 'node-fetch', 'isomorphic-fetch', 'cross-fetch', 'ky', 'got', 'superagent', 'request'];

    return {
      // Check for global fetch(), window.fetch/XMLHttpRequest/WebSocket, and require() of network libs
      CallExpression(node) {
        // Direct fetch() call
        if (node.callee.type === 'Identifier') {
          if (node.callee.name === 'fetch') {
            context.report({ node, messageId: 'noFetch' });
          }
        }
        // window.fetch(), window.XMLHttpRequest(), window.WebSocket()
        if (node.callee.type === 'MemberExpression') {
          if (node.callee.object.name === 'window' && forbiddenGlobals.includes(node.callee.property.name)) {
            context.report({ node, messageId: 'noFetch' });
          }
        }
        // require('axios'), require('node-fetch'), etc.
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal'
        ) {
          const source = node.arguments[0].value;
          if (typeof source === 'string' && forbiddenImports.some(lib => source === lib || source.startsWith(lib + '/'))) {
            context.report({ node, messageId: 'noNetworkImport' });
          }
        }
      },

      // Check for new XMLHttpRequest() or new WebSocket()
      NewExpression(node) {
        if (node.callee.type === 'Identifier') {
          if (node.callee.name === 'XMLHttpRequest') {
            context.report({ node, messageId: 'noXHR' });
          }
          if (node.callee.name === 'WebSocket') {
            context.report({ node, messageId: 'noWebSocket' });
          }
        }
      },

      // Check for imports of network libraries
      ImportDeclaration(node) {
        const source = node.source.value;
        if (forbiddenImports.some(lib => source === lib || source.startsWith(lib + '/'))) {
          context.report({ node, messageId: 'noNetworkImport' });
        }
      },
    };
  },
};
