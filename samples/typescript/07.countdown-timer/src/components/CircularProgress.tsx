import React, { ReactNode } from "react";
import { tokens } from "@fluentui/react-components";

interface CircularProgressProps {
    remaining: number;
    duration: number;
    children?: ReactNode;
    size?: number;
    strokeWidth?: number;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
    remaining,
    duration,
    children,
    size = 256,
    strokeWidth = 16,
}) => {
    const radius = size / 2 - strokeWidth; // Adjusted based on size
    const circumference = 2 * Math.PI * radius;
    const percent = (remaining / duration) * 100;
    const offset = (percent / 100) * circumference;

    return (
        <div
            style={{
                position: "relative",
                width: `${size}px`,
                height: `${size}px`,
            }}
        >
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                style={{ position: "absolute", top: 0, left: 0 }}
            >
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={tokens.colorNeutralBackground5}
                    strokeWidth={strokeWidth}
                    fill="none"
                    transform={`rotate(-90, ${size / 2}, ${size / 2})`}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={tokens.colorBrandForeground1}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={circumference - offset}
                    transform={`rotate(-90, ${size / 2}, ${size / 2})`}
                    strokeLinecap="round"
                />
            </svg>
            <div
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                }}
            >
                {children}
            </div>
        </div>
    );
};
