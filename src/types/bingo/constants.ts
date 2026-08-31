import type { StampName } from "@shared/bingo-transport";

export const REACTION_IMAGE_SOURCES: Record<StampName, string> = {
  crap: "/ReactionIcon/crap.png",
  good: "/ReactionIcon/good.png",
  cracker: "/ReactionIcon/cracker.png",
  heart: "/ReactionIcon/heart.png",
  smile: "/ReactionIcon/smile.png",
  angry: "/ReactionIcon/angry.png",
  skull: "/ReactionIcon/skull.png",
  sad: "/ReactionIcon/sad.png",
};

export const REACTION_IMAGES: ReadonlyArray<{ name: StampName; src: string; alt: string }> =
  Object.entries(REACTION_IMAGE_SOURCES).map(([name, src]) => ({
    name: name as StampName,
    src,
    alt: `${name} icon`,
  }));
