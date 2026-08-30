"use client";

import { Settings } from "lucide-react";

import IconFramework from "@/components/user/icons/IconFramework/IconFramework";

interface SettingsIconProps {
  isOpen: boolean;
  setIsSettingsModalOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  id?: string;
}

const SettingsIcon = ({ isOpen, setIsSettingsModalOpen, id }: SettingsIconProps) => {
  return (
    <IconFramework
      icon={<Settings />}
      text="Settings"
      outline
      inversion={isOpen}
      onClick={() => setIsSettingsModalOpen?.(!isOpen)}
      id={id}
    />
  );
};

export default SettingsIcon;
