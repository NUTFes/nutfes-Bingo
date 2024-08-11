import React, { useState } from "react";
import { IconFramework } from "@/components/common";
import { IoIosSettings } from "react-icons/io";

const SettingIcon = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const handleClick = () => {
    // TODO Modalの開閉を行う
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

export default SettingIcon;
