"use client";

import { useRouter } from "next/navigation";
import { BiGift } from "react-icons/bi";

import IconFramework from "@/features/user/_shared/icons/IconFramework/IconFramework";

interface PrizesIconProps {
  id?: string;
}

const PrizesIcon = ({ id }: PrizesIconProps) => {
  const router = useRouter();

  return (
    <IconFramework
      icon={<BiGift />}
      text="Prizes"
      outline
      onClick={() => router.push("/prizes")}
      id={id}
    />
  );
};

export default PrizesIcon;
