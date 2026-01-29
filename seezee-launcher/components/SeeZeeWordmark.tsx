import React from "react"

type Props = {
	className?: string
	size?: "sm" | "md" | "lg"
	leftText?: string
	highlightText?: string
	rightText?: string
}

const SIZE_CLASSES: Record<NonNullable<Props["size"]>, string> = {
	sm: "text-lg md:text-xl",
	md: "text-2xl md:text-3xl",
	lg: "text-4xl md:text-6xl",
}

export default function SeeZeeWordmark({
	className = "",
	size = "md",
	leftText = "See",
	highlightText = "Zee",
	rightText = "Hub",
}: Props) {

	return (
		<div
			className={
				"select-none leading-none font-black tracking-tight " +
				SIZE_CLASSES[size] +
				" " +
				className
			}
			aria-label={`${leftText}${highlightText}${rightText}`}
		>
			<span className="text-white/90">{leftText}</span>
			<span
				className="text-seezee-red"
				style={{
					textShadow: "0 0 16px rgb(var(--seezee-accent) / 0.38)",
				}}
			>
				{highlightText}
			</span>
			<span className="text-white/90">{rightText}</span>
		</div>
	)
}
