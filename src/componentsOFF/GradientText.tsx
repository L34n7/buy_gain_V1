import { ReactNode } from "react";

type GradientTextProps = {
  children: ReactNode;
};

export default function GradientText({ children }: GradientTextProps) {
  return <span className="gradient-text">{children}</span>;
}