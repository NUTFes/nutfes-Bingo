import { useNavigate } from "react-router";
import { TiArrowBack } from "react-icons/ti";

import IconFramework from "@/components/user/icons/IconFramework/IconFramework";

interface BackIconProps {
  id?: string;
}

const BackIcon = ({ id }: BackIconProps) => {
  const navigate = useNavigate();

  return (
    <IconFramework
      icon={<TiArrowBack />}
      text="Back"
      outline
      onClick={() => navigate("/")}
      id={id}
    />
  );
};

export default BackIcon;
