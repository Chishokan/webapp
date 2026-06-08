import Image from "next/image";
import logo from "../../public/logo.png";

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <Image
        src={logo}
        alt="智翔館"
        priority
        className="h-9 w-auto"
        sizes="120px"
      />
      <span className="hidden border-l border-brand-200 pl-2.5 text-base font-bold text-brand-700 sm:inline">
        おはよう勉強会
      </span>
    </span>
  );
}
