import { useEffect } from "react";
import { createPortal } from "react-dom";

type PropsType = {
  isOpen: boolean;
  onClose: () => void;
} & (
  | {
      channel: "youtube";
      videoId: string;
    }
  | {
      channel?: "custom";
      src: string;
    }
);

export default function VideoModal({ isOpen, onClose, ...props }: PropsType) {
  if (!isOpen) return null;

  let src = "";
  if (props.channel === "youtube") {
    src = `https://www.youtube.com/embed/${props.videoId}?autoplay=1&rel=0`;
  } else {
    src = props.src;
  }


  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 px-4">
      <div className="relative w-full max-w-4xl rounded-lg overflow-hidden shadow-xl bg-black">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 text-white text-3xl hover:text-red-500 transition"
        >
          <span className="sr-only">Close modal</span>
          &times;
        </button>

        {/* Video Frame */}
        <iframe
          width="100%"
          height="500"
          src={src}
          allow="autoplay; fullscreen"
          allowFullScreen
          className="w-full h-[300px] md:h-[500px]"
        />
      </div>
    </div>,
    document.body
  );
}
