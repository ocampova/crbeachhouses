import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import Svg, {
  Circle,
  Ellipse,
  Path,
  Rect,
  G,
  Defs,
  RadialGradient,
  Stop,
  LinearGradient as SvgLinearGradient,
} from 'react-native-svg';
import { colors } from '../theme/colors';

type Mood = 'neutral' | 'happy' | 'thinking' | 'concerned' | 'excited';

interface GuruAvatarProps {
  mood: Mood;
  isTalking: boolean;
  size?: number;
}

const AnimatedG = Animated.createAnimatedComponent(G);

export function GuruAvatar({ mood, isTalking, size = 160 }: GuruAvatarProps) {
  // Animation values
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const mouthAnim = useRef(new Animated.Value(0)).current;
  const bobAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;
  const eyebrowAnim = useRef(new Animated.Value(0)).current;

  const scale = size / 160;

  // Blinking animation
  useEffect(() => {
    const blink = () => {
      Animated.sequence([
        Animated.delay(2000 + Math.random() * 3000),
        Animated.timing(blinkAnim, { toValue: 0.05, duration: 80, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
      ]).start(() => blink());
    };
    blink();
  }, [blinkAnim]);

  // Talking mouth animation
  useEffect(() => {
    if (isTalking) {
      const talk = Animated.loop(
        Animated.sequence([
          Animated.timing(mouthAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.timing(mouthAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        ])
      );
      talk.start();
      return () => talk.stop();
    } else {
      Animated.timing(mouthAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start();
    }
  }, [isTalking, mouthAnim]);

  // Bobbing animation
  useEffect(() => {
    const bob = Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(bobAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    bob.start();
    return () => bob.stop();
  }, [bobAnim]);

  // Glow pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.5, duration: 1500, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [glowAnim]);

  // Eyebrow animation based on mood
  useEffect(() => {
    const targetValue =
      mood === 'concerned' ? 1 :
      mood === 'excited' || mood === 'happy' ? -1 :
      mood === 'thinking' ? 0.5 : 0;
    Animated.timing(eyebrowAnim, { toValue: targetValue, duration: 300, useNativeDriver: true }).start();
  }, [mood, eyebrowAnim]);

  const bobTranslate = bobAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  });

  const mouthOpenScale = mouthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  const eyebrowTranslate = eyebrowAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-3, 0, 3],
  });

  // Mood-based colors
  const moodColors = {
    neutral: { aura: '#3B82F6', tie: '#3B82F6', glow: '#3B82F620' },
    happy: { aura: '#10B981', tie: '#10B981', glow: '#10B98120' },
    thinking: { aura: '#8B5CF6', tie: '#8B5CF6', glow: '#8B5CF620' },
    concerned: { aura: '#EF4444', tie: '#EF4444', glow: '#EF444420' },
    excited: { aura: '#F59E0B', tie: '#F59E0B', glow: '#F59E0B20' },
  };

  const mc = moodColors[mood];

  return (
    <View style={[styles.container, { width: size + 40, height: size + 40 }]}>
      {/* Outer glow */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: size + 30,
            height: size + 30,
            borderRadius: (size + 30) / 2,
            backgroundColor: mc.glow,
            opacity: glowAnim,
          },
        ]}
      />

      <Animated.View
        style={{
          transform: [{ translateY: bobTranslate }],
          width: size,
          height: size,
        }}
      >
        <Svg width={size} height={size} viewBox="0 0 160 160">
          <Defs>
            <RadialGradient id="skinGrad" cx="50%" cy="40%" r="60%">
              <Stop offset="0%" stopColor="#FDE68A" />
              <Stop offset="100%" stopColor="#F59E0B" />
            </RadialGradient>
            <RadialGradient id="bodyGrad" cx="50%" cy="30%" r="70%">
              <Stop offset="0%" stopColor="#1E3A5F" />
              <Stop offset="100%" stopColor="#0F172A" />
            </RadialGradient>
            <SvgLinearGradient id="suitGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#1E3A5F" />
              <Stop offset="100%" stopColor="#0F1F3D" />
            </SvgLinearGradient>
          </Defs>

          {/* Body / Suit */}
          <Ellipse cx="80" cy="148" rx="42" ry="22" fill="url(#bodyGrad)" />
          <Rect x="55" y="108" width="50" height="55" rx="8" fill="url(#suitGrad)" />

          {/* Shirt collar */}
          <Path d="M 72 108 L 80 125 L 88 108 Z" fill="#F8FAFC" />
          <Path d="M 72 108 L 65 108 L 80 125 Z" fill="#E2E8F0" />
          <Path d="M 88 108 L 95 108 L 80 125 Z" fill="#E2E8F0" />

          {/* Tie */}
          <Path d="M 79 125 L 76 135 L 80 140 L 84 135 L 81 125 Z" fill={mc.tie} />
          <Path d="M 79 125 L 81 125 L 82 128 L 78 128 Z" fill={mc.aura} />

          {/* Shoulders */}
          <Ellipse cx="50" cy="115" rx="18" ry="12" fill="url(#suitGrad)" />
          <Ellipse cx="110" cy="115" rx="18" ry="12" fill="url(#suitGrad)" />

          {/* Neck */}
          <Rect x="70" y="95" width="20" height="18" rx="5" fill="url(#skinGrad)" />

          {/* Head */}
          <Ellipse cx="80" cy="70" rx="38" ry="42" fill="url(#skinGrad)" />

          {/* Hair */}
          <Ellipse cx="80" cy="32" rx="36" ry="18" fill="#1E293B" />
          <Path d="M 44 55 Q 38 35 44 25 Q 55 18 80 28" fill="#1E293B" />
          <Path d="M 116 55 Q 122 35 116 25 Q 105 18 80 28" fill="#1E293B" />
          {/* Hair highlights */}
          <Path d="M 65 30 Q 75 25 85 28" stroke="#334155" strokeWidth="2" fill="none" />

          {/* Glasses frame */}
          <Circle cx="65" cy="68" r="13" fill="none" stroke="#94A3B8" strokeWidth="2.5" />
          <Circle cx="95" cy="68" r="13" fill="none" stroke="#94A3B8" strokeWidth="2.5" />
          <Path d="M 78 68 L 82 68" stroke="#94A3B8" strokeWidth="2.5" />
          <Path d="M 52 64 L 48 62" stroke="#94A3B8" strokeWidth="2" />
          <Path d="M 108 64 L 112 62" stroke="#94A3B8" strokeWidth="2" />
          {/* Glasses lens tint */}
          <Circle cx="65" cy="68" r="12" fill="#60A5FA" opacity="0.1" />
          <Circle cx="95" cy="68" r="12" fill="#60A5FA" opacity="0.1" />

          {/* Eyebrows */}
          <AnimatedG style={{ transform: [{ translateY: eyebrowTranslate }] }}>
            <Path
              d={mood === 'concerned'
                ? "M 55 52 Q 65 56 75 54"
                : mood === 'excited'
                ? "M 55 56 Q 65 50 75 52"
                : "M 55 54 Q 65 51 75 53"}
              stroke="#1E293B"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d={mood === 'concerned'
                ? "M 85 54 Q 95 56 105 52"
                : mood === 'excited'
                ? "M 85 52 Q 95 50 105 56"
                : "M 85 53 Q 95 51 105 54"}
              stroke="#1E293B"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          </AnimatedG>

          {/* Eyes */}
          <G>
            {/* Left eye */}
            <Animated.View
              style={{
                position: 'absolute',
                transform: [{ scaleY: blinkAnim }],
              }}
            />
            <Circle cx="65" cy="68" r="6" fill="#1E293B" />
            <Circle cx="65" cy="68" r="3.5" fill="#3B82F6" />
            <Circle cx="65" cy="68" r="2" fill="#1E293B" />
            <Circle cx="67" cy="66" r="1.2" fill="white" />

            {/* Right eye */}
            <Circle cx="95" cy="68" r="6" fill="#1E293B" />
            <Circle cx="95" cy="68" r="3.5" fill="#3B82F6" />
            <Circle cx="95" cy="68" r="2" fill="#1E293B" />
            <Circle cx="97" cy="66" r="1.2" fill="white" />
          </G>

          {/* Eyelids for blinking (animated) */}
          <AnimatedG style={{ transform: [{ scaleY: Animated.subtract(new Animated.Value(1), blinkAnim) }] }}>
            <Rect x="52" y="62" width="26" height="12" rx="6" fill="url(#skinGrad)" />
            <Rect x="82" y="62" width="26" height="12" rx="6" fill="url(#skinGrad)" />
          </AnimatedG>

          {/* Nose */}
          <Path d="M 78 75 Q 80 82 82 75" stroke="#D97706" strokeWidth="1.5" fill="none" strokeLinecap="round" />

          {/* Cheek blush */}
          <Ellipse cx="56" cy="80" rx="8" ry="5" fill="#FCA5A5" opacity="0.3" />
          <Ellipse cx="104" cy="80" rx="8" ry="5" fill="#FCA5A5" opacity="0.3" />

          {/* Mouth - animated */}
          <AnimatedG
            style={{
              transform: [{ scaleY: mouthOpenScale }],
              transformOrigin: '80 87',
            }}
          >
            {mood === 'happy' || mood === 'excited' ? (
              <>
                {/* Happy/excited smile */}
                <Path
                  d="M 68 87 Q 80 97 92 87"
                  stroke="#1E293B"
                  strokeWidth="2.5"
                  fill={isTalking ? '#FBBF24' : 'none'}
                  strokeLinecap="round"
                />
                {isTalking && (
                  <Path d="M 68 87 Q 80 97 92 87 Q 80 90 68 87 Z" fill="#1E293B" opacity="0.3" />
                )}
              </>
            ) : mood === 'concerned' ? (
              <Path
                d="M 68 92 Q 80 84 92 92"
                stroke="#1E293B"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
            ) : mood === 'thinking' ? (
              <Path
                d="M 71 89 Q 80 90 89 87"
                stroke="#1E293B"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
            ) : (
              <>
                {/* Neutral / talking */}
                <Path
                  d="M 68 89 Q 80 94 92 89"
                  stroke="#1E293B"
                  strokeWidth="2.5"
                  fill={isTalking ? '#E5E7EB' : 'none'}
                  strokeLinecap="round"
                />
                {isTalking && (
                  <Ellipse cx="80" cy="91" rx="10" ry="4" fill="#1E293B" opacity="0.2" />
                )}
              </>
            )}
          </AnimatedG>

          {/* Thinking bubble indicator */}
          {mood === 'thinking' && (
            <>
              <Circle cx="115" cy="45" r="3" fill="#8B5CF6" opacity="0.6" />
              <Circle cx="122" cy="38" r="4" fill="#8B5CF6" opacity="0.7" />
              <Circle cx="130" cy="30" r="6" fill="#8B5CF6" opacity="0.8" />
            </>
          )}

          {/* Excited sparkles */}
          {mood === 'excited' && (
            <>
              <Path d="M 20 35 L 22 30 L 24 35 L 29 37 L 24 39 L 22 44 L 20 39 L 15 37 Z" fill="#F59E0B" opacity="0.8" />
              <Path d="M 130 25 L 132 20 L 134 25 L 139 27 L 134 29 L 132 34 L 130 29 L 125 27 Z" fill="#F59E0B" opacity="0.7" />
            </>
          )}

          {/* Aura ring */}
          <Circle cx="80" cy="80" r="72" fill="none" stroke={mc.aura} strokeWidth="1.5" opacity="0.3" strokeDasharray="4 4" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
});
