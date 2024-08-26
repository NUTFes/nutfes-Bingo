import React, { useState } from "react";
import { IconFramework } from "@/components/common";
import { IoIosSettings } from "react-icons/io";

interface SettingsIconProps {
  onClick?: () => void;
}
const SettingsIcon = (props: SettingsIconProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleClick = () => {
    if (props.onClick) {
      props.onClick();
    }
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
