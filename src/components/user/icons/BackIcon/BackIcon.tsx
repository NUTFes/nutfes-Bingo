import { ArrowLeft } from "lucide-react";

import IconFramework from "@/components/user/icons/IconFramework/IconFramework";

interface BackIconProps {
  id?: string;
}

const BackIcon = ({ id }: BackIconProps) => (
  <IconFramework icon={<ArrowLeft />} text="Back" outline href="/" id={id} />
);

export default BackIcon;
