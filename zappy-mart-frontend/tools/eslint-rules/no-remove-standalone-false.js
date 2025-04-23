module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent removal of `standalone: false` in Angular components',
      recommended: 'warn',
    },
    fixable: null,
    schema: [],
    messages: {
      preserveStandalone:
        "Do not remove 'standalone: false'; it's required to opt-out of standalone mode in Angular 19.",
    },
  },

  create(context) {
    return {
      'Decorator[expression.callee.name="Component"] ObjectExpression > Property[key.name="standalone"][value.value=false]'(
        node
      ) {
        context.report({
          node,
          messageId: 'preserveStandalone',
        });
      },
    };
  },
};
