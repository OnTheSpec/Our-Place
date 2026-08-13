"use client";

import { useEffect, useRef } from "react";
import { Mesh, Program, Renderer, Triangle, Vec3 } from "ogl";

import { cn } from "@/lib/utils";

export type VoicePoweredOrbProps = {
  className?: string;
  hue?: number;
  enableVoiceControl?: boolean;
  voiceSensitivity?: number;
  maxRotationSpeed?: number;
  maxHoverIntensity?: number;
  onVoiceDetected?: (detected: boolean) => void;
};

const VERTEX_SHADER = /* glsl */ `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uRotation;
  uniform float uHue;
  uniform vec3 uPeach;
  uniform vec3 uRose;
  uniform vec3 uClay;
  uniform vec3 uAmber;
  uniform vec3 uForest;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.55;
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p);
      p = p * 2.03 + 11.7;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 p = vUv - 0.5;
    float angle = uRotation;
    mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    p = rotation * p;

    float slowTime = uTime * (0.045 + uIntensity * 0.035);
    float folds = fbm(p * (3.0 + uIntensity * 0.55) + vec2(slowTime, -slowTime * 0.7));
    float light = 1.0 - smoothstep(0.1, 0.82, length(p - vec2(-0.10, 0.16)));
    float edgeWarmth = smoothstep(0.1, 0.78, length(p));
    float hueWarmth = 0.5 + 0.5 * sin(radians(uHue));

    vec3 color = mix(uPeach, uRose, smoothstep(0.18, 0.72, folds));
    color = mix(color, uClay, smoothstep(0.58, 0.94, folds + edgeWarmth * 0.16));
    color = mix(color, uAmber, light * (0.22 + uIntensity * 0.13));
    color = mix(color, uForest, smoothstep(0.74, 1.2, edgeWarmth + (1.0 - folds) * 0.25) * 0.36);
    color = mix(color, mix(uAmber, uRose, hueWarmth), 0.06);
    color += vec3(1.0, 0.76, 0.57) * light * 0.09;

    gl_FragColor = vec4(color, 1.0);
  }
`;

const PEACH = new Vec3(0.945, 0.702, 0.435);
const ROSE = new Vec3(0.843, 0.482, 0.529);
const CLAY = new Vec3(0.643, 0.278, 0.208);
const AMBER = new Vec3(0.875, 0.659, 0.247);
const FOREST = new Vec3(0.141, 0.353, 0.333);

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function VoicePoweredOrb({
  className,
  hue = 14,
  enableVoiceControl = false,
  voiceSensitivity = 1.25,
  maxRotationSpeed = 0.075,
  maxHoverIntensity = 0.18,
  onVoiceDetected,
}: VoicePoweredOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const intensityRef = useRef(0);
  const voiceLevelRef = useRef(0);
  const enabledRef = useRef(enableVoiceControl);
  const optionsRef = useRef({ hue, maxRotationSpeed, maxHoverIntensity });
  const callbackRef = useRef(onVoiceDetected);
  const detectedRef = useRef(false);

  useEffect(() => {
    enabledRef.current = enableVoiceControl;
  }, [enableVoiceControl]);

  useEffect(() => {
    optionsRef.current = { hue, maxRotationSpeed, maxHoverIntensity };
  }, [hue, maxRotationSpeed, maxHoverIntensity]);

  useEffect(() => {
    callbackRef.current = onVoiceDetected;
  }, [onVoiceDetected]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.setAttribute("role", "presentation");
    canvas.tabIndex = -1;

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        canvas,
        alpha: true,
        antialias: true,
        depth: false,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      });
    } catch {
      return;
    }

    const gl = renderer.gl;
    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: VERTEX_SHADER,
      fragment: FRAGMENT_SHADER,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0 },
        uRotation: { value: 0 },
        uHue: { value: optionsRef.current.hue },
        uPeach: { value: PEACH },
        uRose: { value: ROSE },
        uClay: { value: CLAY },
        uAmber: { value: AMBER },
        uForest: { value: FOREST },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });
    canvas.className = "voice-heart-canvas";
    container.appendChild(canvas);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let rotation = 0;
    let lastTime = performance.now();

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      renderer.setSize(Math.max(1, width), Math.max(1, height));
    };

    const renderFrame = (time: number) => {
      const elapsed = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      const options = optionsRef.current;
      const target = enabledRef.current
        ? Math.min(1, 0.34 + voiceLevelRef.current)
        : options.maxHoverIntensity;
      intensityRef.current += (target - intensityRef.current) * 0.045;
      rotation += elapsed * options.maxRotationSpeed * (0.25 + intensityRef.current);
      program.uniforms.uTime.value = time / 1000;
      program.uniforms.uIntensity.value = intensityRef.current;
      program.uniforms.uRotation.value = rotation;
      program.uniforms.uHue.value = options.hue;
      renderer.render({ scene: mesh });
      frame = requestAnimationFrame(renderFrame);
    };

    const renderStatic = () => {
      program.uniforms.uTime.value = 0;
      program.uniforms.uIntensity.value = 0;
      program.uniforms.uRotation.value = 0;
      renderer.render({ scene: mesh });
    };

    const syncMotion = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (reducedMotion.matches) renderStatic();
      else {
        lastTime = performance.now();
        frame = requestAnimationFrame(renderFrame);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    reducedMotion.addEventListener("change", syncMotion);
    syncMotion();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      reducedMotion.removeEventListener("change", syncMotion);
      program.remove();
      canvas.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  useEffect(() => {
    if (!enableVoiceControl) {
      voiceLevelRef.current = 0;
      if (detectedRef.current) {
        detectedRef.current = false;
        callbackRef.current?.(false);
      }
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;
    let context: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;
    let audioFrame = 0;

    const initialiseMicrophone = async () => {
      if (!navigator.mediaDevices?.getUserMedia) return;

      try {
        const lateStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled || !enabledRef.current) {
          stopStream(lateStream);
          return;
        }
        stream = lateStream;

        const AudioContextConstructor = window.AudioContext;
        if (!AudioContextConstructor) {
          stopStream(stream);
          stream = null;
          return;
        }

        context = new AudioContextConstructor();
        analyser = context.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.82;
        source = context.createMediaStreamSource(stream);
        source.connect(analyser);
        const samples = new Uint8Array(analyser.fftSize);

        const sampleVoice = () => {
          if (cancelled || !analyser) return;
          analyser.getByteTimeDomainData(samples);
          let energy = 0;
          for (const sample of samples) {
            const centered = (sample - 128) / 128;
            energy += centered * centered;
          }
          const level = Math.sqrt(energy / samples.length) * voiceSensitivity;
          voiceLevelRef.current += (Math.min(1, level * 5) - voiceLevelRef.current) * 0.22;
          const detected = level > 0.075;
          if (detected !== detectedRef.current) {
            detectedRef.current = detected;
            callbackRef.current?.(detected);
          }
          audioFrame = requestAnimationFrame(sampleVoice);
        };

        audioFrame = requestAnimationFrame(sampleVoice);
      } catch {
        cancelAnimationFrame(audioFrame);
        source?.disconnect();
        analyser?.disconnect();
        stopStream(stream);
        stream = null;
        if (context && context.state !== "closed") void context.close();
        context = null;
        voiceLevelRef.current = 0;
      }
    };

    void initialiseMicrophone();

    return () => {
      cancelled = true;
      cancelAnimationFrame(audioFrame);
      source?.disconnect();
      analyser?.disconnect();
      stopStream(stream);
      if (context && context.state !== "closed") void context.close();
      voiceLevelRef.current = 0;
      if (detectedRef.current) {
        detectedRef.current = false;
        callbackRef.current?.(false);
      }
    };
  }, [enableVoiceControl, voiceSensitivity]);

  return <div ref={containerRef} className={cn("voice-heart-visual", className)} aria-hidden="true">
    <span className="voice-heart-fallback" />
  </div>;
}
