'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { InteractionPoint, InteractionAnswer, VideoSession } from '@/lib/catalog';
import { WistiaPlayer, WistiaHandle, wistiaId } from './WistiaPlayer';

type Props = {
  session: VideoSession;
  interactions: InteractionPoint[];
  childId: string;
  parentId: string;
  onCompleted?: () => void;
};

type Stage = 'playing' | 'question' | 'feedback' | 'rpe' | 'done';

export function InteractivePlayer({ session, interactions, childId, parentId, onCompleted }: Props) {
  const wid = wistiaId(session.video_url);

  const videoRef = useRef<HTMLVideoElement>(null);
  const wistiaRef = useRef<WistiaHandle | null>(null);
  const runIdRef = useRef<string | null>(null);
  const creatingRunRef = useRef(false);
  const answeredRef = useRef<Set<string>>(new Set());
  const stageRef = useRef<Stage>('playing');
  const lastTimeRef = useRef(0);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [stage, setStage] = useState<Stage>('playing');
  const [activeInteraction, setActiveInteraction] = useState<InteractionPoint | null>(null);
  const [chosen, setChosen] = useState<InteractionAnswer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rpe, setRpe] = useState<number | null>(null);
  const [syncError, setSyncError] = useState(false);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  // Contrôles unifiés : Wistia si c'est une vidéo Wistia, sinon la balise <video>.
  const playMedia = useCallback(() => {
    if (wid) wistiaRef.current?.play();
    else videoRef.current?.play();
  }, [wid]);

  const pauseMedia = useCallback(() => {
    if (wid) wistiaRef.current?.pause();
    else videoRef.current?.pause();
  }, [wid]);

  // Crée le run (une seule fois : la garde par ref évite le doublon du
  // double-montage StrictMode et les re-runs de l'effet).
  const ensureRun = useCallback(async () => {
    if (runIdRef.current || creatingRunRef.current) return;
    creatingRunRef.current = true;
    const { data, error } = await supabase
      .from('video_session_runs')
      .insert({
        video_session_id: session.id,
        child_id: childId,
        parent_id: parentId,
      })
      .select('id')
      .single();
    if (data) {
      runIdRef.current = data.id;
      setSyncError(false);
    } else if (error) {
      // Nouvel essai possible au prochain play
      creatingRunRef.current = false;
      setSyncError(true);
    }
  }, [session.id, childId, parentId]);

  useEffect(() => {
    ensureRun();
  }, [ensureRun]);

  // Sauvegarde périodique de la progression
  const saveProgress = useCallback(async (seconds: number) => {
    if (!runIdRef.current) return;
    const { error } = await supabase
      .from('video_session_runs')
      .update({ progress_seconds: Math.floor(seconds) })
      .eq('id', runIdRef.current);
    if (error) setSyncError(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPlaying) return;
      const t = wid ? wistiaRef.current?.time() : videoRef.current?.currentTime;
      if (typeof t === 'number') saveProgress(t);
    }, 10000);
    return () => clearInterval(interval);
  }, [saveProgress, isPlaying, wid]);

  // Flush de la progression à la fermeture/sortie de page : sans lui, jusqu'à
  // 10 s de progression étaient perdues à chaque sortie.
  useEffect(() => {
    const flush = () => {
      if (lastTimeRef.current > 0) saveProgress(lastTimeRef.current);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      flush();
    };
  }, [saveProgress]);

  // Nettoyage du timer de feedback (sinon reprise de lecture sur player démonté)
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  // Déclenche l'interaction au timecode atteint — appelé par Wistia et par <video>.
  const handleTime = useCallback(
    (currentTime: number) => {
      setProgress(currentTime);
      lastTimeRef.current = currentTime;
      if (stageRef.current !== 'playing') return;
      const due = interactions.find(
        (i) => !answeredRef.current.has(i.id) && currentTime >= i.timecode_seconds
      );
      if (due) {
        pauseMedia();
        setActiveInteraction(due);
        setStage('question');
      }
    },
    [interactions, pauseMedia]
  );

  const handleAnswer = async (answer: InteractionAnswer) => {
    if (!activeInteraction) return;
    answeredRef.current.add(activeInteraction.id);
    setChosen(answer);
    setStage('feedback');

    if (runIdRef.current) {
      const { data } = await supabase
        .from('video_session_runs')
        .select('answers_log')
        .eq('id', runIdRef.current)
        .single();
      const log = Array.isArray(data?.answers_log) ? data.answers_log : [];
      const { error } = await supabase
        .from('video_session_runs')
        .update({
          answers_log: [
            ...log,
            {
              interaction_id: activeInteraction.id,
              answer_key: answer.key,
              tag: answer.tag,
              score: answer.score,
              answered_at: new Date().toISOString(),
            },
          ],
        })
        .eq('id', runIdRef.current);
      if (error) setSyncError(true);
    } else {
      setSyncError(true);
    }

    // Feedback bref puis reprise de la vidéo (timer nettoyé au démontage)
    feedbackTimerRef.current = setTimeout(() => {
      setActiveInteraction(null);
      setChosen(null);
      setStage('playing');
      playMedia();
    }, 1800);
  };

  const handleEnded = useCallback(async () => {
    await saveProgress(duration);
    setStage('rpe');
  }, [saveProgress, duration]);

  const handleRpe = async (value: number) => {
    setRpe(value);
    if (runIdRef.current) {
      const { error } = await supabase
        .from('video_session_runs')
        .update({ rpe: value, completed_at: new Date().toISOString() })
        .eq('id', runIdRef.current);
      if (error) setSyncError(true);
    } else {
      setSyncError(true);
    }
    setStage('done');
    onCompleted?.();
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    v.currentTime = ratio * duration;
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div
      ref={containerRef}
      className="relative aspect-video rounded-2xl overflow-hidden bg-navy-900 shadow-card group"
    >
      {wid ? (
        <WistiaPlayer
          hashedId={wid}
          onReady={(h) => {
            wistiaRef.current = h;
          }}
          onTime={handleTime}
          onEnded={handleEnded}
          onPlay={() => {
            setIsPlaying(true);
            ensureRun(); // nouvel essai si l'insert du run avait échoué
          }}
          onPause={() => setIsPlaying(false)}
          onDuration={(d) => setDuration(d)}
        />
      ) : (
        <video
          ref={videoRef}
          src={session.video_url ?? undefined}
          className="w-full h-full object-contain"
          onTimeUpdate={(e) => handleTime(e.currentTarget.currentTime)}
          onEnded={handleEnded}
          onPlay={() => {
            setIsPlaying(true);
            ensureRun();
          }}
          onPause={() => setIsPlaying(false)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onClick={togglePlay}
          playsInline
        />
      )}

      {/* Bandeau discret si la progression ne se synchronise pas */}
      {syncError && stage !== 'done' && (
        <div className="absolute top-2 inset-x-2 z-20 flex justify-center pointer-events-none">
          <p className="px-3 py-1.5 rounded-full bg-red-500/85 text-white text-[11px] font-semibold backdrop-blur-sm">
            Progression non enregistrée — vérifie ta connexion
          </p>
        </div>
      )}

      {/* Contrôles personnalisés — uniquement pour la balise <video>.
          Le player Wistia fournit ses propres contrôles. */}
      {!wid && stage === 'playing' && (
        <div className="absolute inset-x-0 bottom-0 px-4 md:px-5 pb-3 md:pb-4 pt-12 bg-gradient-to-t from-navy-900/90 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          {/* Zone de tap élargie autour de la barre de progression */}
          <div className="py-3 -my-3 cursor-pointer" onClick={seek}>
            <div className="h-1.5 rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-sun"
                style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-4 mt-2">
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'Mettre en pause' : 'Lire'}
              className="w-11 h-11 rounded-full bg-sun text-navy-900 flex items-center justify-center text-sm font-bold shrink-0"
            >
              {isPlaying ? '❚❚' : '▶'}
            </button>
            <span className="text-white/90 text-xs font-medium tabular-nums shrink-0">
              {fmt(progress)} / {fmt(duration)}
            </span>
            <span className="ml-auto text-sage text-xs truncate hidden sm:block">
              Séance {session.session_number} · {session.title}
            </span>
            <button
              onClick={() => {
                const el = containerRef.current;
                if (!el) return;
                if (document.fullscreenElement) document.exitFullscreen();
                else el.requestFullscreen?.();
              }}
              aria-label="Plein écran"
              className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shrink-0 transition-colors"
            >
              ⛶
            </button>
          </div>
        </div>
      )}

      {/* Grand bouton play au départ — uniquement pour la balise <video> */}
      {!wid && !isPlaying && stage === 'playing' && progress === 0 && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-navy-900/40"
        >
          <span className="w-20 h-20 rounded-full bg-sun text-navy-900 flex items-center justify-center text-3xl shadow-card hover:scale-105 transition-transform">
            ▶
          </span>
        </button>
      )}

      {/* Overlay question A/B/C/D */}
      {stage === 'question' && activeInteraction && (
        // Scrollable : sur mobile (conteneur 16:9 ≈ 193px de haut), le contenu
        // dépasse forcément — sans scroll, des réponses seraient inaccessibles.
        <div className="absolute inset-0 bg-navy-900/80 backdrop-blur-xl overflow-y-auto z-10">
          <div className="min-h-full flex flex-col items-center justify-center p-4 sm:p-8">
            <p className="text-sun text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] mb-2 sm:mb-4">
              À toi de jouer !
            </p>
            <h3 className="font-display text-base sm:text-2xl md:text-3xl text-white text-center max-w-2xl mb-3 sm:mb-8">
              {activeInteraction.question_text}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 w-full max-w-2xl">
              {activeInteraction.answers.map((a) => (
                <button
                  key={a.key}
                  onClick={() => handleAnswer(a)}
                  className="flex items-center gap-3 p-2.5 sm:p-4 min-h-[44px] rounded-2xl bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/20 hover:border-sun text-left transition-all group/answer"
                >
                  <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-sun text-navy-900 flex items-center justify-center font-bold shrink-0">
                    {a.key}
                  </span>
                  <span className="text-white text-sm md:text-base">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Feedback après réponse */}
      {stage === 'feedback' && chosen && (
        <div className="absolute inset-0 bg-navy-900/80 backdrop-blur-xl flex flex-col items-center justify-center p-8 z-10">
          <span className="w-16 h-16 rounded-full bg-sage text-navy-900 flex items-center justify-center text-2xl mb-4">
            ✓
          </span>
          <p className="font-display text-2xl text-white mb-2">Super réponse !</p>
          <p className="text-sage text-sm">La séance continue…</p>
        </div>
      )}

      {/* RPE en fin de séance */}
      {stage === 'rpe' && (
        <div className="absolute inset-0 bg-navy-900/80 backdrop-blur-xl overflow-y-auto z-10">
          <div className="min-h-full flex flex-col items-center justify-center p-4 sm:p-8">
            <p className="text-sun text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] mb-2 sm:mb-3">
              Dernière question
            </p>
            <h3 className="font-display text-lg sm:text-2xl text-white text-center mb-1 sm:mb-2">
              C&apos;était difficile aujourd&apos;hui ?
            </h3>
            <p className="text-sage text-xs sm:text-sm mb-4 sm:mb-8">0 = très facile · 10 = très difficile</p>
            <div className="flex flex-wrap justify-center gap-2 max-w-xl">
              {Array.from({ length: 11 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleRpe(i)}
                  className="w-11 h-11 rounded-full bg-navy-800 hover:bg-sun hover:text-navy-900 text-white font-bold transition-colors"
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Écran final */}
      {stage === 'done' && (
        <div className="absolute inset-0 bg-gradient-to-br from-navy-700 to-navy-900 overflow-y-auto z-10">
          <div className="min-h-full flex flex-col items-center justify-center p-4 sm:p-8 text-center">
            <span className="w-12 h-12 sm:w-20 sm:h-20 rounded-full bg-sun text-navy-900 flex items-center justify-center text-xl sm:text-3xl mb-3 sm:mb-5">
              ★
            </span>
            <h3 className="font-display text-xl sm:text-3xl text-white mb-2 sm:mb-3">Séance terminée, bravo !</h3>
            <p className="text-navy-100/85 max-w-md mb-2 text-sm sm:text-base">
              {session.life_skill
                ? `Aujourd'hui, vous avez travaillé : ${session.life_skill.toLowerCase()}.`
                : 'Belle séance parent-enfant.'}
            </p>
            <p className="text-sage text-xs sm:text-sm max-w-md">
              Suggestion à la maison : reparlez d&apos;un moment de la séance au souper, et
              demandez à votre enfant ce qu&apos;il a préféré.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
