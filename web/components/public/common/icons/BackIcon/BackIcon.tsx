"use client";

import { useRouter } from "next/navigation";
import { TiArrowBack } from "react-icons/ti";

import IconFramework from "@/components/public/common/icons/IconFramework/IconFramework";

interface BackIconProps {
  id?: string;
}

const BackIcon = ({ id }: BackIconProps) => {
  const router = useRouter();

  return (
    <IconFramework icon={<TiArrowBack />} text="Back" onClick={() => router.push("/")} id={id} />
  );
};

export default BackIcon;
