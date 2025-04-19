// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockRouter = require("next-router-mock").default;

// Create a mock Link component that updates the router when clicked
module.exports = ({ href, children, ...props }) => {
  const handleClick = (e) => {
    e.preventDefault();
    mockRouter.push(href);
    if (props.onClick) {
      props.onClick(e);
    }
  };

  return {
    type: "a",
    props: {
      href,
      ...props,
      children,
      onClick: handleClick,
    },
  };
};
