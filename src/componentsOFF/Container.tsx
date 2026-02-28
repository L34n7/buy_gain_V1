import { ReactNode } from "react";

type ContainerProps = {
  children: ReactNode;
};

export default function Container({ children }: ContainerProps) {
  return (
    <div className="glass max-w-3xl mx-auto mt-12">
      {children}
    </div>
  );
}