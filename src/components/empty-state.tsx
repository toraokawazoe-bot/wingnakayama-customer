import { Inbox } from "lucide-react";

type Props = {
  message: string;
  className?: string;
};

export function EmptyState({ message, className = "" }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 py-10 text-gray-400 ${className}`}>
      <Inbox className="w-8 h-8" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
