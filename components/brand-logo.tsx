import Image from "next/image";

import logo from "@/new_logo.png";

type BrandLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function BrandLogo({
  size = 32,
  className,
  priority = false,
}: BrandLogoProps) {
  return (
    <Image
      src={logo}
      alt="Preqly logo"
      width={size}
      height={size}
      priority={priority}
      className={className}
    />
  );
}
