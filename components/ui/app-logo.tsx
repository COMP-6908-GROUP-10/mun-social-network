import Image from "next/image";
import {TypographyH1} from "@/components/ui/typography";

export default function AppLogo({ size = 60, className }: { size?: number, className?: string })  {
    return (
        <div className={"flex gap-4 items-center"}>
            <Image src={"/brand_logo.png"} alt={"app logo"} width={size} height={size} />
            <TypographyH1 className={className}> MUN SOCIAL </TypographyH1>
        </div>
    )
}