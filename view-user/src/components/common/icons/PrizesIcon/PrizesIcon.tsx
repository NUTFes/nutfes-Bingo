import { IconFramework } from "@/components/common";
import { BiGift } from "react-icons/bi";
import { useRouter } from "next/router";

interface PrizesIconProps {
  id?: string;
}

const PrizesIcon = (props: PrizesIconProps) => {
  const router = useRouter();

  const handleClick = () => {
    if (typeof window !== "undefined") {
      router.push("/prizes");
    }
  };

  return (
    <IconFramework
      icon={<BiGift />}
      text="Prizes"
      outline
      onClick={() => handleClick()}
      id={props.id ? props.id : ""}
    />
  );
};

export default PrizesIcon;
