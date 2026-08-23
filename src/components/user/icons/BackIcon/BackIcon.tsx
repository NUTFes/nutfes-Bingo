"use client";

import { useRouter } from "next/navigation";
import { TiArrowBack } from "react-icons/ti";

import IconFramework from "@/components/user/icons/IconFramework/IconFramework";

interface BackIconProps {
  id?: string;
}

const BackIcon = ({ id }: BackIconProps) => {
  const { push } = useRouter();

  return <IconFramework icon={<TiArrowBack />} text="Back" onClick={() => push("/")} id={id} />;
};

export default BackIcon;
