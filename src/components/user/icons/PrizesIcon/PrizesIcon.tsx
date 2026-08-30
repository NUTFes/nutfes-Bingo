"use client";

import { Gift } from "lucide-react";

import IconFramework from "@/components/user/icons/IconFramework/IconFramework";

interface PrizesIconProps {
  id?: string;
}

const PrizesIcon = ({ id }: PrizesIconProps) => (
  <IconFramework icon={<Gift />} text="Prizes" outline href="/prizes" id={id} />
);

export default PrizesIcon;
