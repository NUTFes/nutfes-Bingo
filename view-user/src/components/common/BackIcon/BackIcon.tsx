import React from "react";
import { IconFramework } from "@/components/common";
import { TiArrowBack } from "react-icons/ti";
import { useRouter } from "next/router";

const BackIcon = () => {
  const router = useRouter();

  const handleClick = () => {
    if (typeof window !== "undefined") {
      router.back();
    }
  };

  return (
    <IconFramework
      icon={<TiArrowBack />}
      text="Back"
      onClick={() => handleClick()}
    />
  );
};

export default BackIcon;
