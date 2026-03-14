"use client";

import { IoIosSettings } from "react-icons/io";

import IconFramework from "@/components/user/common/icons/IconFramework/IconFramework";

interface SettingsIconProps {
  isOpen: boolean;
  setIsSettingsModalOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  id?: string;
}

const SettingsIcon = ({ isOpen, setIsSettingsModalOpen, id }: SettingsIconProps) => {
  return (
    <IconFramework
      icon={<IoIosSettings />}
      text="Settings"
      outline
      inversion={isOpen}
      onClick={() => setIsSettingsModalOpen?.(!isOpen)}
      id={id}
    />
  );
};

export default SettingsIcon;
