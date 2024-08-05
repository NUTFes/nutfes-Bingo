import React from "react";
import { IconFramework } from "@/components/common";
import { BiGift } from "react-icons/bi";
import { useRouter } from "next/router";

const PrizesIcon = () => {
  const router = useRouter();

  const handleClick = () => {
    if (typeof window !== "undefined") {
      router.push("/");
    }
  };

  return (
    <IconFramework
      icon={<BiGift />}
      text="Prizes"
      outline
      onClick={() => handleClick()}
    />
  );
};

export default PrizesIcon;
