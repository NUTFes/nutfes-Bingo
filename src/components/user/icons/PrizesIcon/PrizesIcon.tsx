import { useNavigate } from "react-router";
import { BiGift } from "react-icons/bi";

import IconFramework from "@/components/user/icons/IconFramework/IconFramework";

interface PrizesIconProps {
  id?: string;
}

const PrizesIcon = ({ id }: PrizesIconProps) => {
  const navigate = useNavigate();

  return (
    <IconFramework
      icon={<BiGift />}
      text="Prizes"
      outline
      onClick={() => navigate("/prizes")}
      id={id}
    />
  );
};

export default PrizesIcon;
