import React, { useState, useEffect } from "react";
import { IconFramework } from "@/components/common";
import { IoIosSettings } from "react-icons/io";

interface SettingsIconProps {
  onClick?: () => void;
  isOpen: boolean;
  setIsSettingsModalOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}
const SettingsIcon = (props: SettingsIconProps) => {
  const [colorInversion, setColorInversion] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleClick = () => {
    if (props.onClick) {
      props.onClick();
    }
    setColorInversion(!colorInversion);
    if (props.setIsSettingsModalOpen) {
      props.setIsSettingsModalOpen(!props.isOpen);
    }
  };

  useEffect(() => {
    if (!props.isOpen) {
      setColorInversion(false);
    }
  }, [props.isOpen]);

  return (
    <IconFramework
      icon={<IoIosSettings />}
      text="Settings"
      outline
      inversion={colorInversion}
      onClick={() => handleClick()}
    />
  );
};

export default SettingsIcon;
