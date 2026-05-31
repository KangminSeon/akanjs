import type { cnst } from "@libs/shared/client";
import { clsx } from "akanjs/client";
import { Image } from "akanjs/ui";

interface BannerViewProps {
  className?: string;
  banner: cnst.Banner;
  self?: { id?: string } | null;
}

export const General = ({ className, banner, self }: BannerViewProps) => {
  return (
    <div className={clsx(className, `w-full animate-fadeIn`)}>
      <div>{banner.title}</div>
      <div>{banner.content}</div>
      <Image file={banner.image} />
    </div>
  );
};
