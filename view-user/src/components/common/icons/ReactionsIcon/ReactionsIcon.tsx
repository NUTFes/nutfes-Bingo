import React from "react";
import { IconFramework } from "@/components/common";
import { FaRegFaceSmile } from "react-icons/fa6";

interface ReactionsIconProps {
  isOpen: boolean;
  setIsReactionModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}
const ReactionsIcon = (props: ReactionsIconProps) => {
  const handleClick = () => {
    props.setIsReactionModalOpen(!props.isOpen);
  };

  return (
    <IconFramework
      icon={<FaRegFaceSmile />}
      text="Reactions"
      inversion
      onClick={() => handleClick()}
    />
  );
};

export default ReactionsIcon;
