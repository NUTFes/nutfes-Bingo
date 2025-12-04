import React from "react";
import { IconFramework } from "@/components/common";
import { TiArrowBack } from "react-icons/ti";
import { useRouter } from "next/router";
import { useAtomValue } from "jotai";
import { languageState } from "@/state/language";

interface BackIconProps {
  id?: string;
}

const BackIcon = (props: BackIconProps) => {
  const router = useRouter();
  const language = useAtomValue(languageState);

  const handleClick = () => {
    if (typeof window !== "undefined") {
      router.push("/", "/", { locale: language });
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
