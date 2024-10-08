import { useCallback, useState, useEffect } from "react";
import styles from "./HelpCarousel.module.css";
import { Button, Modal, DotButton } from "@/components";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { useRouter } from "next/router";
import { ja, en } from "@/locales";

interface HelpCarouselProps {
  isOpened: boolean;
  setIsOpened: (isOpened: boolean) => void;
}

const HelpCarousel = ({ isOpened, setIsOpened }: HelpCarouselProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [slidesCount, setSlidesCount] = useState<number>(0);
  const { locale } = useRouter();
  const [] = useState<string>(locale || "ja");
  const t = locale === "ja" ? ja : en;

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
      <div className={styles.container}>
        <div className={styles.embla} ref={emblaRef}>
          <div className={styles.embla__container}>
            {images.map((image, index) => (
              <Image
                key={index}
                className={styles.embla__slide}
                src={image.src}
                alt={image.alt}
                width={1000}
                height={1000}
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
            {selectedIndex === 0 ? (
              <Button onClick={() => setIsOpened(false)} inversion>
                <div className={styles.buttonText}>{t.helpCarousel.close}</div>
              </Button>
            ) : (
              <Button onClick={scrollPrev} inversion>
                <div className={styles.buttonText}>{t.helpCarousel.back}</div>
              </Button>
            )}
            {selectedIndex === slidesCount - 1 ? (
              <Button onClick={() => setIsOpened(false)} inversion>
                <div className={styles.buttonText}>{t.helpCarousel.close}</div>
              </Button>
            ) : (
              <Button onClick={scrollNext} inversion>
                <div className={styles.buttonText}>{t.helpCarousel.next}</div>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default HelpCarousel;
