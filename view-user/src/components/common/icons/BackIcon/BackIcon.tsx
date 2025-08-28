import React from "react";
import { IconFramework } from "@/components/common";
import { TiArrowBack } from "react-icons/ti";
import { useRouter } from "next/router";

interface BackIconProps {
  id?: string;
}

const BackIcon = (props: BackIconProps) => {
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
      id={props.id ? props.id : undefined}
    />
  );
};

export default BackIcon;
