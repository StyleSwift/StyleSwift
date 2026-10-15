import {Audio} from '@remotion/media';
import {Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import audio from './audio.json';
import {CUES, MUSIC, MUSIC_TRIM_BEFORE, TOTAL_FRAMES, cueFrame} from './script';

export const Soundtrack = () => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [TOTAL_FRAMES - MUSIC.fadeFrames, TOTAL_FRAMES], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <>
      <Audio src={staticFile(`audio/${audio.music.file}`)} trimBefore={MUSIC_TRIM_BEFORE} volume={audio.music.volume * fade} />
      {CUES.map((c, i) => (
        <Sequence key={i} from={cueFrame(c)} durationInFrames={c.frames} layout="none">
          <Audio src={staticFile(`audio/${audio[c.sfx].file}`)} volume={audio[c.sfx].volume} />
        </Sequence>
      ))}
    </>
  );
};
