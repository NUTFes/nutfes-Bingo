"use client";

import React from "react";
import { IconFramework } from "@/components/user/common";
import { IoIosSettings } from "react-icons/io";

interface SettingsIconProps {
  onClick?: () => void;
  isOpen: boolean;
  setIsSettingsModalOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  id?: string;
}
const SettingsIcon = (props: SettingsIconProps) => {
  const handleClick = () => {
    if (props.onClick) {
      props.onClick();
    }
    if (props.setIsSettingsModalOpen) {
      props.setIsSettingsModalOpen(!props.isOpen);
    }
  };

  return (
    <IconFramework
      icon={<IoIosSettings />}
      text="Settings"
      outline
      inversion={props.isOpen}
      onClick={() => handleClick()}
      id={props.id ? props.id : ""}
    />
  );
};

export default SettingsIcon;
