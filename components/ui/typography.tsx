import React from "react";
import {cn} from "@/lib/utils";

export function TypographyH1({ children, className } : Readonly<{ children: React.ReactNode, className?: string }>) {
    return (
        <h1 className={cn(`scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance`, className)}>
            { children }
        </h1>
    )
}

export function TypographyH3({ children, className } : Readonly<{ children: React.ReactNode, className?: string }>) {
    return (
        <h3 className={cn('scroll-m-20 text-2xl font-semibold tracking-tight', className)}>
            { children }
        </h3>
    )
}

export function TypographyH2({ children, className } : Readonly<{ children: React.ReactNode, className?: string }>) {
    return (
        <h2 className={cn("scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0", className)}>
            { children }
        </h2>
    )
}



export function TypographyBlockquote({ children } : Readonly<{ children: React.ReactNode }>) {
    return (
        <blockquote className="mt-6 border-l-2 pl-6 italic">
            { children }
        </blockquote>
    )
}

export function TypographyH4({ children } : Readonly<{ children: React.ReactNode }>) {
    return (
        <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
            { children }
        </h4>
    )
}

export function TypographyLarge({ children, className } : Readonly<{ children: React.ReactNode, className?: string }>) {
    return <div className={cn(`text-lg font-semibold`, className)}>{ children }</div>
}

export function TypographyP({ children, className } : Readonly<{ children: React.ReactNode, className?: string }>) {
    return (
        <p className={cn("leading-7 [&:not(:first-child)]:mt-6", className)}>
            { children }
        </p>
    )
}

export function TypographySmall({ children, className } : Readonly<{ children: React.ReactNode, className?: string }>) {
    return (
        <small className={cn("text-sm leading-normal font-medium", className)}> { children } </small>
    )
}
