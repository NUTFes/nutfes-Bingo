"use client";

import React from "react";
import { IconFramework } from "@/components/user/common";
import { BiGift } from "react-icons/bi";
import { useRouter } from "next/navigation";

interface PrizesIconProps {
  id?: string;
}

const PrizesIcon = (props: PrizesIconProps) => {
  const router = useRouter();

  const handleClick = () => {
    router.push("/prizes");
  };

  return (
    <IconFramework
      icon={<BiGift />}
      text="Prizes"
      outline
      onClick={() => handleClick()}
      id={props.id ? props.id : ""}
    />
  );
};

export default PrizesIcon;
