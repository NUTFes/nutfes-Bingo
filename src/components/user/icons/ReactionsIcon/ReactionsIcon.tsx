import { Smile } from "lucide-react";

import IconFramework from "@/components/user/icons/IconFramework/IconFramework";

interface ReactionsIconProps {
  isOpen: boolean;
  id?: string;
  setIsReactionModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ReactionsIcon = ({ isOpen, id, setIsReactionModalOpen }: ReactionsIconProps) => {
  return (
    <IconFramework
      icon={<Smile />}
      text="Reactions"
      inversion
      onClick={() => setIsReactionModalOpen(!isOpen)}
      id={id}
    />
  );
};

export default ReactionsIcon;
