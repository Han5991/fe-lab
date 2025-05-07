module.exports = {
  Button: ({ children, ...props }) => ({
    type: 'Button',
    props: { ...props, children },
  }),
};
