"use client";

import { FaRegFaceSmile } from "react-icons/fa6";

import IconFramework from "@/features/user/_shared/icons/IconFramework/IconFramework";

interface ReactionsIconProps {
  isOpen: boolean;
  id?: string;
  setIsReactionModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ReactionsIcon = ({ isOpen, id, setIsReactionModalOpen }: ReactionsIconProps) => {
  return (
    <IconFramework
      icon={<FaRegFaceSmile />}
      text="Reactions"
      inversion={isOpen}
      onClick={() => setIsReactionModalOpen(!isOpen)}
      id={id}
    />
  );
};

export default ReactionsIcon;
