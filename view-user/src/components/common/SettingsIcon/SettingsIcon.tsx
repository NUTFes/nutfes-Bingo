import React, { useState } from "react";
import { IconFramework } from "@/components/common";
import { IoIosSettings } from "react-icons/io";
import { useResultChange } from "@/contexts/ResultChangeContext";

interface SettingsIconProps {
  onClick?: () => void;
}
const SettingsIcon = (props: SettingsIconProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { toggleResultChange } = useResultChange();

  const handleClick = () => {
    // TODO Modalの開閉を行う
    toggleResultChange();
  };

  return (
    <IconFramework
      icon={<IoIosSettings />}
      text="Settings"
      outline
      onClick={() => handleClick()}
    />
  );
};

export default SettingsIcon;
