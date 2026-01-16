"use client";

import React from "react";
import { IconFramework } from "@/components/user/common";
import { TiArrowBack } from "react-icons/ti";
import { useRouter } from "next/navigation";

interface BackIconProps {
  id?: string;
}

const BackIcon = (props: BackIconProps) => {
  const router = useRouter();

  const handleClick = () => {
    router.push("/");
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
