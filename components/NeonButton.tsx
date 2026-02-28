import { ReactNode } from "react";

type NeonButtonProps = {
  children: ReactNode;
};

export default function NeonButton({ children }: NeonButtonProps) {
  return (
    <button className="px-6 py-3 bg-purple-600 rounded-xl shadow-[0_0_20px_#8b5cf6] hover:shadow-[0_0_30px_#a855f7] transition font-bold text-lg">
      {children}
    </button>
  );
}