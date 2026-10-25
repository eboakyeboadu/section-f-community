import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Volume2, 
  VolumeX, 
  X, 
  Check, 
  Radio
} from 'lucide-react';
import { Profile, HousingType } from '../types';

interface VoiceOnboardingProps {
  initialProfile: Partial<Profile>;
  onCompleteVoice: (parsedProfile: Partial<Profile>) => void;
  onCancel: () => void;
}

interface ConversationState {
  stage: number;
  userFullName: string;
  userNickname: string;
  userHometown: string;
  userHousing: string;
  userHousingType: HousingType;
  userCompany: string;
  userRole: string;
  userSchool: string;
  userExploration: string[];
  userFunFact: string;
}

export const VoiceOnboarding: React.FC<VoiceOnboardingProps> = ({
  initialProfile,
  onCompleteVoice,
  onCancel
}) => {
  const [stage, setStage] = useState<number>(0);
  const [assistantStatus, setAssistantStatus] = useState<'speaking' | 'listening' | 'thinking' | 'finished'>('speaking');
  const [currentAiSpeech, setCurrentAiSpeech] = useState<string>('');
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [micActive, setMicActive] = useState<boolean>(false);
  const [speechVolume, setSpeechVolume] = useState<number>(1);
  const [isUserSpeaking, setIsUserSpeaking] = useState<boolean>(false);

  // Accumulated conversation data
  const [profileData, setProfileData] = useState<ConversationState>({
    stage: 0,
    userFullName: initialProfile.fullName || '',
    userNickname: initialProfile.nickname || '',
    userHometown: initialProfile.hometown || '',
    userHousing: initialProfile.housingDetail || '',
    userHousingType: initialProfile.housingType || 'dorm',
    userCompany: initialProfile.preHbsCompany || '',
    userRole: initialProfile.preHbsRole || '',
    userSchool: initialProfile.undergradSchool || '',
    userExploration: initialProfile.postHbsExploration || [],
    userFunFact: initialProfile.funFact || '',
  });

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const isListeningIntentRef = useRef<boolean>(false);
  const currentTranscriptRef = useRef<string>('');

  // Update transcript ref whenever liveTranscript changes
  useEffect(() => {
    currentTranscriptRef.current = liveTranscript;
  }, [liveTranscript]);

  // Natural text-to-speech helper
  const speakAssistant = (text: string, onEndCallback?: () => void) => {
    setCurrentAiSpeech(text);
    setAssistantStatus('speaking');
    setLiveTranscript('');
    currentTranscriptRef.current = '';

    // Stop recognition while AI is speaking so it doesn't transcribe itself
    stopListening();

    if ('speechSynthesis' in window && !isMuted) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Select natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(v => 
        (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Alex')) &&
        v.lang.startsWith('en')
      );
      if (naturalVoice) utterance.voice = naturalVoice;

      utterance.onend = () => {
        setAssistantStatus('listening');
        if (onEndCallback) onEndCallback();
        startListening();
      };

      utterance.onerror = () => {
        setAssistantStatus('listening');
        if (onEndCallback) onEndCallback();
        startListening();
      };

      window.speechSynthesis.speak(utterance);
    } else {
      // Fallback timer if muted or synthesis unavailable
      const duration = Math.max(2000, text.length * 55);
      const timer = setTimeout(() => {
        setAssistantStatus('listening');
        if (onEndCallback) onEndCallback();
        startListening();
      }, duration);
      return () => clearTimeout(timer);
    }
  };

  // Start continuous, robust speech recognition
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition not supported in this browser.");
      setAssistantStatus('listening');
      return;
    }

    // Stop existing instance before starting fresh
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setMicActive(true);
        setAssistantStatus('listening');
        isListeningIntentRef.current = true;
      };

      recognition.onspeechstart = () => {
        setIsUserSpeaking(true);
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      };

      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript + ' ';
        }
        const cleaned = fullTranscript.trim();
        if (cleaned) {
          setLiveTranscript(cleaned);
          currentTranscriptRef.current = cleaned;
          setIsUserSpeaking(true);

          // Reset silence timer on every new speech token
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }

          // When user finishes speaking (pause of 2.2 seconds), process their answer automatically
          silenceTimerRef.current = setTimeout(() => {
            if (currentTranscriptRef.current.trim().length > 0) {
              processUserSpeech(currentTranscriptRef.current);
            }
          }, 2200);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition event:", event.error);
        if (event.error === 'no-speech') {
          // Keep listening
        } else if (event.error === 'not-allowed') {
          setMicActive(false);
        }
      };

      recognition.onend = () => {
        setIsUserSpeaking(false);
        // If we still want to be listening, automatically restart recognition
        if (isListeningIntentRef.current && assistantStatus === 'listening') {
          try {
            recognition.start();
          } catch (e) {}
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Speech recognition start failed:", err);
    }
  };

  const stopListening = () => {
    isListeningIntentRef.current = false;
    setMicActive(false);
    setIsUserSpeaking(false);
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  };

  // Initial welcome greeting
  useEffect(() => {
    const welcome = "Hi, welcome to Section F! I'm your onboarding buddy. What's your full name and nickname?";
    speakAssistant(welcome);

    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      stopListening();
    };
  }, []);

  // Periodic visual ripple wave when listening or speaking
  useEffect(() => {
    const interval = setInterval(() => {
      if (assistantStatus === 'speaking') {
        setSpeechVolume(Math.random() * 0.5 + 0.9);
      } else if (isUserSpeaking) {
        setSpeechVolume(Math.random() * 0.6 + 1.1);
      } else {
        setSpeechVolume(1);
      }
    }, 150);
    return () => clearInterval(interval);
  }, [assistantStatus, isUserSpeaking]);

  // Process whatever the user actually said
  const processUserSpeech = (rawText: string) => {
    const userUtterance = rawText.trim();
    if (!userUtterance) return;

    // Clear live transcript & stop listening during processing
    stopListening();
    setAssistantStatus('thinking');

    // Stage 0: Name & Nickname
    if (stage === 0) {
      // Extract name from what the user said
      let parsedName = userUtterance
        .replace(/^(my name is|i am|i'm|this is|call me)\s+/i, '')
        .split(/[,.]/)[0]
        .trim();

      // Look for nickname in user sentence
      let parsedNickname = '';
      const nicknameMatch = userUtterance.match(/call me\s+([A-Za-z]+)/i) || 
                            userUtterance.match(/nickname\s+(?:is\s+)?([A-Za-z]+)/i) ||
                            userUtterance.match(/go by\s+([A-Za-z]+)/i);
      if (nicknameMatch && nicknameMatch[1]) {
        parsedNickname = nicknameMatch[1].trim();
      } else {
        parsedNickname = parsedName.split(' ')[0];
      }

      if (!parsedName) parsedName = userUtterance;

      setProfileData(prev => ({
        ...prev,
        userFullName: parsedName,
        userNickname: parsedNickname,
      }));

      setStage(1);
      const nextResponse = `Nice to meet you, ${parsedNickname || parsedName}! Where are you from originally? What's your hometown and country?`;
      setTimeout(() => {
        speakAssistant(nextResponse);
      }, 500);
      return;
    }

    // Stage 1: Hometown & Origin
    if (stage === 1) {
      const parsedHometown = userUtterance
        .replace(/^(i'm from|i am from|from|originally from|born in|grew up in)\s+/i, '')
        .trim();

      setProfileData(prev => ({
        ...prev,
        userHometown: parsedHometown || userUtterance,
      }));

      setStage(2);
      const nextResponse = `Awesome, ${parsedHometown}! And where are you living this year? In the campus dorms like Mellon or Chase, Soldiers Field Park, or off-campus?`;
      setTimeout(() => {
        speakAssistant(nextResponse);
      }, 500);
      return;
    }

    // Stage 2: Housing
    if (stage === 2) {
      const lower = userUtterance.toLowerCase();
      let detectedType: HousingType = 'dorm';
      if (lower.includes('sfp') || lower.includes('soldiers') || lower.includes('park')) {
        detectedType = 'sfp';
      } else if (lower.includes('owa') || lower.includes('western') || lower.includes('one western')) {
        detectedType = 'owa';
      } else if (lower.includes('off') || lower.includes('akron') || lower.includes('street') || lower.includes('cambridge') || lower.includes('boston')) {
        detectedType = 'off_campus';
      }

      setProfileData(prev => ({
        ...prev,
        userHousing: userUtterance,
        userHousingType: detectedType,
      }));

      setStage(3);
      const nextResponse = `Got it! What was your role and company before coming to HBS, and where did you go for undergrad?`;
      setTimeout(() => {
        speakAssistant(nextResponse);
      }, 500);
      return;
    }

    // Stage 3: Pre-HBS Job & College
    if (stage === 3) {
      setProfileData(prev => ({
        ...prev,
        userCompany: userUtterance,
        userRole: userUtterance.split(' at ')[0] || 'Associate',
        userSchool: 'College Graduate',
      }));

      setStage(4);
      const nextResponse = `Impressive background! What industries, startup spaces, or career paths are you excited to explore post-HBS?`;
      setTimeout(() => {
        speakAssistant(nextResponse);
      }, 500);
      return;
    }

    // Stage 4: Post-HBS Exploration
    if (stage === 4) {
      const tags = userUtterance
        .split(/,|and|\//)
        .map(t => t.trim().replace(/^(i'm exploring|i want to explore|interested in)\s+/i, ''))
        .filter(t => t.length > 1);

      setProfileData(prev => ({
        ...prev,
        userExploration: tags.length > 0 ? tags : [userUtterance],
      }));

      setStage(5);
      const nextResponse = `Great goals! Lastly, give Section F a fun fact or memorable icebreaker to share with the cohort!`;
      setTimeout(() => {
        speakAssistant(nextResponse);
      }, 500);
      return;
    }

    // Stage 5: Fun fact & wrap-up
    if (stage === 5) {
      const updatedState = {
        ...profileData,
        userFunFact: userUtterance,
      };
      setProfileData(updatedState);
      setAssistantStatus('finished');

      const closing = `That's great! Your Section F Card is complete. Let's take a look!`;
      speakAssistant(closing, () => {
        // Complete voice setup and build profile
        const compiledProfile: Partial<Profile> = {
          fullName: updatedState.userFullName || 'Section F Member',
          nickname: updatedState.userNickname || updatedState.userFullName.split(' ')[0],
          hometown: updatedState.userHometown || 'United States',
          homeCountry: updatedState.userHometown.includes(',') ? updatedState.userHometown.split(',').pop()?.trim() : 'United States',
          housingDetail: updatedState.userHousing || 'On-Campus',
          housingType: updatedState.userHousingType || 'dorm',
          preHbsCompany: updatedState.userCompany || 'Pre-HBS',
          preHbsRole: updatedState.userRole || 'Professional',
          undergradSchool: updatedState.userSchool || 'Alum',
          postHbsExploration: updatedState.userExploration.length > 0 ? updatedState.userExploration : ['Early-Stage VC', 'Tech'],
          funFact: userUtterance,
        };
        setTimeout(() => {
          onCompleteVoice(compiledProfile);
        }, 1200);
      });
    }
  };

  // Manual trigger if user wants to speak or submit current transcript immediately
  const handleOrbClick = () => {
    if (assistantStatus === 'speaking') {
      // Interrupt AI and listen immediately
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setAssistantStatus('listening');
      startListening();
    } else if (assistantStatus === 'listening') {
      if (liveTranscript.trim().length > 0) {
        processUserSpeech(liveTranscript);
      } else {
        // Restart speech listener
        startListening();
      }
    }
  };

  return (
    <div className="relative min-h-[460px] bg-[#0B0813] border border-[#2E244A] rounded-3xl p-6 shadow-2xl flex flex-col justify-between items-center text-center overflow-hidden">
      
      {/* Ambient background glows */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-[#581C87]/40 blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-[#F59E0B]/15 blur-3xl pointer-events-none -z-10" />

      {/* Top Header Controls */}
      <div className="w-full flex items-center justify-between z-10">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
            Section F Voice Setup
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => {
              setIsMuted(!isMuted);
              if (!isMuted && 'speechSynthesis' in window) window.speechSynthesis.cancel();
            }}
            className="p-2 rounded-full bg-[#171226] border border-[#2E244A] text-slate-300 hover:text-white transition-all cursor-pointer"
            title={isMuted ? "Unmute Voice" : "Mute Voice"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#F59E0B]" />}
          </button>

          <button
            type="button"
            onClick={() => {
              stopListening();
              onCancel();
            }}
            className="text-xs text-purple-200 hover:text-white px-3 py-1.5 rounded-full bg-[#171226] border border-[#2E244A] transition-colors cursor-pointer"
          >
            Switch to manual filling
          </button>
        </div>
      </div>

      {/* Centerpiece: Dynamic Pulsing Voice Orb */}
      <div className="my-auto flex flex-col items-center justify-center relative py-6">
        
        {/* Outer Glow Halo */}
        <div 
          className={`absolute w-56 h-56 rounded-full transition-all duration-300 pointer-events-none ${
            assistantStatus === 'speaking'
              ? 'bg-gradient-to-tr from-[#581C87]/60 via-[#7E22CE]/40 to-[#F59E0B]/30 blur-2xl scale-125 animate-pulse'
              : isUserSpeaking
              ? 'bg-gradient-to-tr from-emerald-500/40 to-cyan-500/40 blur-2xl scale-130'
              : assistantStatus === 'listening'
              ? 'bg-gradient-to-tr from-[#581C87]/40 to-amber-500/20 blur-xl scale-105'
              : 'bg-[#581C87]/20 blur-xl scale-95'
          }`}
        />

        {/* Interactive Center Orb */}
        <button
          type="button"
          onClick={handleOrbClick}
          className="relative z-20 w-36 h-36 rounded-full bg-gradient-to-tr from-[#581C87] via-[#8B5CF6] to-[#F59E0B] p-1 shadow-[0_0_50px_rgba(139,92,246,0.5)] cursor-pointer transition-transform duration-200 active:scale-95 group"
          style={{ transform: `scale(${speechVolume})` }}
        >
          <div className="w-full h-full rounded-full bg-[#0B0813]/90 backdrop-blur-md flex flex-col items-center justify-center text-white relative overflow-hidden">
            
            <div className="absolute inset-0 bg-gradient-to-t from-[#581C87]/30 via-transparent to-[#F59E0B]/20 animate-spin" style={{ animationDuration: '10s' }} />

            {assistantStatus === 'speaking' && (
              <div className="relative z-10 flex flex-col items-center space-y-1">
                <Volume2 className="w-8 h-8 text-[#F59E0B] animate-bounce" />
                <span className="text-[10px] font-bold text-amber-200 uppercase tracking-widest">Speaking</span>
              </div>
            )}

            {assistantStatus === 'listening' && (
              <div className="relative z-10 flex flex-col items-center space-y-1">
                <Mic className={`w-8 h-8 ${isUserSpeaking ? 'text-emerald-400 scale-110' : 'text-amber-300'} transition-all`} />
                <span className={`text-[10px] font-bold uppercase tracking-widest ${isUserSpeaking ? 'text-emerald-300' : 'text-slate-300'}`}>
                  {isUserSpeaking ? 'Hearing you...' : 'Listening...'}
                </span>
              </div>
            )}

            {assistantStatus === 'thinking' && (
              <div className="relative z-10 flex flex-col items-center space-y-1">
                <Radio className="w-8 h-8 text-[#F59E0B] animate-pulse" />
                <span className="text-[10px] font-bold text-amber-200 uppercase tracking-widest">Thinking</span>
              </div>
            )}

            {assistantStatus === 'finished' && (
              <div className="relative z-10 flex flex-col items-center space-y-1">
                <Check className="w-8 h-8 text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">Completed</span>
              </div>
            )}
          </div>
        </button>

        {/* Spoken Dialog Text Output */}
        <div className="mt-6 px-4 max-w-sm text-center z-10 space-y-2">
          {assistantStatus === 'speaking' && (
            <p className="text-sm text-white font-medium italic animate-fadeIn leading-relaxed drop-shadow">
              "{currentAiSpeech}"
            </p>
          )}

          {assistantStatus === 'listening' && (
            <div>
              {liveTranscript ? (
                <div className="p-3 bg-[#171226] border border-[#2E244A] rounded-2xl animate-fadeIn">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-0.5">
                    Your Response:
                  </span>
                  <p className="text-xs text-emerald-200 font-medium">
                    "{liveTranscript}"
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 animate-pulse">
                  Speak your answer naturally. I'm listening...
                </p>
              )}
            </div>
          )}

          {assistantStatus === 'thinking' && (
            <p className="text-xs text-amber-300 animate-pulse">
              Understanding your response...
            </p>
          )}
        </div>
      </div>

      {/* Bottom Step Progress Dots */}
      <div className="w-full z-10 pt-2 flex flex-col items-center space-y-2">
        <div className="flex items-center space-x-2">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === stage
                  ? 'w-6 bg-[#F59E0B]'
                  : idx < stage
                  ? 'w-2.5 bg-[#581C87]'
                  : 'w-2 bg-[#2E244A]'
              }`}
            />
          ))}
        </div>
        <span className="text-[10px] text-slate-500">
          {stage === 0 && "Name & Nickname"}
          {stage === 1 && "Hometown & Country"}
          {stage === 2 && "Campus Housing"}
          {stage === 3 && "Pre-HBS Background"}
          {stage === 4 && "Post-HBS Exploration"}
          {stage === 5 && "Fun Fact & Icebreaker"}
        </span>
      </div>

    </div>
  );
};

