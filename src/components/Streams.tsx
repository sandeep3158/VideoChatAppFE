import React from "react";
import ReactPlayer from "react-player";

export const Streams = ({ remoteStream, localStream }) => {
  return (
    <div className="w-full md:w-[65%] relative flex flex-col bg-black rounded-xl overflow-hidden shadow-xl">
      {/* Remote Stream (Main View) */}
      {remoteStream ? (
        <ReactPlayer
          playing
          url={remoteStream}
          width="100%"
          height="100%"
          controls={false}
          muted={false}
          pip={false}
          config={{
            file: {
              attributes: {
                controlsList: 'nodownload nofullscreen noremoteplayback',
                disablePictureInPicture: true,
              },
            },
          }}
          className="pointer-events-none select-none"
        />
      ) : (
        <div className="flex items-center justify-center h-full bg-neutral-900 text-white">
          <p className="text-xl font-light italic opacity-80">Waiting for user to join...</p>
        </div>
      )}

      {/* Local Stream (Top Left Preview) */}
      {localStream && (
        <div className="absolute top-4 left-4 w-40 sm:w-52 md:w-60 rounded-lg shadow-lg backdrop-blur-lg bg-white/10 border border-white/30 overflow-hidden transition-transform hover:scale-105">
          <div className="px-2 py-1 text-white text-sm font-medium bg-black/30 border-b border-white/10">
            You
          </div>
          <ReactPlayer
            playing
            url={localStream}
            muted
            volume={0}
            pip={false}
            controls={false}
            config={{
              file: {
                attributes: {
                  controlsList: 'nodownload nofullscreen noremoteplayback',
                  disablePictureInPicture: true,
                },
              },
            }}
            width="100%"
            height="130px"
            className="pointer-events-none select-none"
          />
        </div>
      )}
    </div>
  );
};
