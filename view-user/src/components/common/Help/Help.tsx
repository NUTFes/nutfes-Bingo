import React, { useCallback, useState, useEffect } from "react";
import styles from "./Help.module.css";
import { Button, Modal, DotButton } from "@/components";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";

interface HelpProps {
  isOpened: boolean;
  setIsOpened: (isOpened: boolean) => void;
}
const Help = ({ isOpened, setIsOpened }: HelpProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [slidesCount, setSlidesCount] = useState(0);
 
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);
  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    setSlidesCount(emblaApi.slideNodes().length);
    emblaApi.on("select", onSelect); 
  }, [emblaApi, onSelect]);
  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index); 
    },
    [emblaApi],
  );

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);
  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const images = [
    { src: "/Help_slide1.png", alt: "Help_slide1" },
    { src: "/Help_slide2.png", alt: "Help_slide2" },
    { src: "/Help_slide3.png", alt: "Help_slide3" },
    { src: "/Help_slide4.png", alt: "Help_slide4" },
    { src: "/Help_slide5.png", alt: "Help_slide5" },
  ];

  return (
    <Modal isOpened={isOpened} setIsOpened={setIsOpened}>
      <div className={styles.embla} ref={emblaRef}>
        <div className={styles.embla__container}>
          {images.map((image, index) => (
            <Image
              key={index}
              className={styles.embla__slide}
              src={image.src}
              alt={image.alt}
              width={300}
              height={300}
            />
          ))}
        </div>
        <div className={styles.carousel__dots}>
          {Array.from({ length: slidesCount }).map((_, index) => (
            <DotButton
              key={index}
              selected={index === selectedIndex}
              onClick={() => scrollTo(index)}
            />
          ))}
        </div>
        <div className={styles.screenTransition}>
          <Button onClick={scrollPrev} inversion={true}>
            戻る
          </Button>
          <Button onClick={scrollNext} inversion={true}>
            次へ
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default Help;