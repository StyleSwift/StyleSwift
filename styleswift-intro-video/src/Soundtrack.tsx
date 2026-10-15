import {Audio} from '@remotion/media';
import {Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import audio from './audio.json';
import {CUES, MUSIC, MUSIC_TRIM_BEFORE, TOTAL_FRAMES, audioFile, beat, soundStart} from './script';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const Soundtrack = () => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [TOTAL_FRAMES - MUSIC.fadeFrames, TOTAL_FRAMES], [1, 0], clamp);
  // The hook sits under the typing at about half level and swells into the drop.
  const duck = interpolate(frame, [0, beat(MUSIC.dropBeat - 2), beat(MUSIC.dropBeat)], [0.45, 0.6, 1], clamp);
  return (
    <>
      <Audio src={staticFile(`audio/${audioFile('music')}`)} trimBefore={MUSIC_TRIM_BEFORE} volume={audio.music.volume * fade * duck} />
      {CUES.map((c, i) => (
        <Sequence key={i} from={soundStart(c)} durationInFrames={c.frames} layout="none">
          <Audio src={staticFile(`audio/${audioFile(c.sfx)}`)} volume={audio[c.sfx].volume} />
        </Sequence>
      ))}
    </>
  );
};
