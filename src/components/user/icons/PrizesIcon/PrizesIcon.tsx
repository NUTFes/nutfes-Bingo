"use client";

import { useRouter } from "next/navigation";
import { BiGift } from "react-icons/bi";

import IconFramework from "@/components/user/icons/IconFramework/IconFramework";

interface PrizesIconProps {
  id?: string;
}

const PrizesIcon = ({ id }: PrizesIconProps) => {
  const { push } = useRouter();

  return (
    <IconFramework
      icon={<BiGift />}
      text="Prizes"
      outline
      onClick={() => push("/prizes")}
      id={id}
    />
  );
};

export default PrizesIcon;
