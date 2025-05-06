import { useState } from "react";

type SimpleButtonProps = {
  initialText?: string;
  onClick?: () => void;
};

export const SimpleButton = ({
  initialText = "Click me",
  onClick,
}: SimpleButtonProps) => {
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    setClicked(true);
    onClick?.();
  };

  return (
    <button onClick={handleClick} data-testid="simple-button">
      {clicked ? "Clicked!" : initialText}
    </button>
  );
};
