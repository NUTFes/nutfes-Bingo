import { IconFramework } from "@/components/common";
import { FaRegFaceSmile } from "react-icons/fa6";

interface ReactionsIconProps {
  isOpen: boolean;
  id?: string;
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
      id={props.id ? props.id : ""}
    />
  );
};

export default ReactionsIcon;
