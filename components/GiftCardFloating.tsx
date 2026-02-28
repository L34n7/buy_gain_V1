import Image from "next/image";

type GiftCardFloatingProps = {
  src: string;
  alt: string;
};

export default function GiftCardFloating({ src, alt }: GiftCardFloatingProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={160}
      height={100}
      className="rounded-xl shadow-lg animate-float opacity-90 hover:opacity-100 transition"
    />
  );
}
