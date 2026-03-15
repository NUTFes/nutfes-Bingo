import type { StampName } from "@/types/bingo/types";

export const PRIZE_IMAGES_BUCKET = "prize-images";

export const REACTION_IMAGES: ReadonlyArray<{ name: StampName; src: string; alt: string }> = [
  { name: "crap", src: "/ReactionIcon/crap.png", alt: "crap icon" },
  { name: "good", src: "/ReactionIcon/good.png", alt: "good icon" },
  { name: "cracker", src: "/ReactionIcon/cracker.png", alt: "cracker icon" },
  { name: "heart", src: "/ReactionIcon/heart.png", alt: "heart icon" },
  { name: "smile", src: "/ReactionIcon/smile.png", alt: "smile icon" },
  { name: "angry", src: "/ReactionIcon/angry.png", alt: "angry icon" },
  { name: "skull", src: "/ReactionIcon/skull.png", alt: "skull icon" },
  { name: "sad", src: "/ReactionIcon/sad.png", alt: "sad icon" },
  // { name: "peace", src: "/ReactionIcon/peace.png", alt: "peace icon" },
  // { name: "surprise", src: "/ReactionIcon/surprise.png", alt: "surprise icon" },
] as const;
