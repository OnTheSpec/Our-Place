/* @vitest-environment jsdom */

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const oglMocks = vi.hoisted(() => ({
  getExtension: vi.fn(),
  loseContext: vi.fn(),
  programRemove: vi.fn(),
  render: vi.fn(),
  setSize: vi.fn(),
}));

vi.mock("ogl", () => {
  class Renderer {
    gl = { getExtension: oglMocks.getExtension };
    render = oglMocks.render;
    setSize = oglMocks.setSize;
  }

  class Program {
    uniforms: Record<string, { value: unknown }>;
    remove = oglMocks.programRemove;

    constructor(_gl: unknown, options: { uniforms: Record<string, { value: unknown }> }) {
      this.uniforms = options.uniforms;
    }
  }

  return {
    Mesh: class Mesh {},
    Program,
    Renderer,
    Triangle: class Triangle {},
    Vec3: class Vec3 {},
  };
});

import { VoicePoweredOrb } from "@/components/ui/voice-powered-orb";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

type AudioHarness = {
  analyser: {
    disconnect: ReturnType<typeof vi.fn>;
    fftSize: number;
    getByteTimeDomainData: ReturnType<typeof vi.fn>;
    smoothingTimeConstant: number;
  };
  close: ReturnType<typeof vi.fn>;
  construct: ReturnType<typeof vi.fn>;
  source: {
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function createStream(trackCount = 2) {
  const tracks = Array.from({ length: trackCount }, () => ({ stop: vi.fn() }));
  return {
    stream: { getTracks: () => tracks } as unknown as MediaStream,
    tracks,
  };
}

function installAudioContext(): AudioHarness {
  const analyser = {
    disconnect: vi.fn(),
    fftSize: 0,
    getByteTimeDomainData: vi.fn(),
    smoothingTimeConstant: 0,
  };
  const source = {
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  const close = vi.fn().mockResolvedValue(undefined);
  const construct = vi.fn(function MockAudioContext() {
    return {
      close,
      createAnalyser: () => analyser,
      createMediaStreamSource: () => source,
      state: "running",
    };
  });

  Object.defineProperty(window, "AudioContext", {
    configurable: true,
    value: construct,
  });

  return { analyser, close, construct, source };
}

const originalAudioContext = Object.getOwnPropertyDescriptor(window, "AudioContext");
const originalCancelAnimationFrame = Object.getOwnPropertyDescriptor(window, "cancelAnimationFrame");
const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
const originalRequestAnimationFrame = Object.getOwnPropertyDescriptor(window, "requestAnimationFrame");

let getUserMedia: ReturnType<typeof vi.fn>;
let matchMediaAdd: ReturnType<typeof vi.fn>;
let matchMediaRemove: ReturnType<typeof vi.fn>;
let requestAnimationFrameMock: ReturnType<typeof vi.fn>;
let cancelAnimationFrameMock: ReturnType<typeof vi.fn>;
let nextFrame: number;

function restoreProperty(target: object, property: string, descriptor?: PropertyDescriptor) {
  if (descriptor) Object.defineProperty(target, property, descriptor);
  else Reflect.deleteProperty(target, property);
}

beforeEach(() => {
  oglMocks.getExtension.mockImplementation((name: string) =>
    name === "WEBGL_lose_context" ? { loseContext: oglMocks.loseContext } : null,
  );

  nextFrame = 1;
  requestAnimationFrameMock = vi.fn(() => nextFrame++);
  cancelAnimationFrameMock = vi.fn();
  Object.defineProperty(window, "requestAnimationFrame", {
    configurable: true,
    value: requestAnimationFrameMock,
  });
  Object.defineProperty(window, "cancelAnimationFrame", {
    configurable: true,
    value: cancelAnimationFrameMock,
  });

  matchMediaAdd = vi.fn();
  matchMediaRemove = vi.fn();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({
      addEventListener: matchMediaAdd,
      matches: false,
      media: "(prefers-reduced-motion: reduce)",
      removeEventListener: matchMediaRemove,
    })),
  });

  getUserMedia = vi.fn();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  restoreProperty(window, "AudioContext", originalAudioContext);
  restoreProperty(window, "cancelAnimationFrame", originalCancelAnimationFrame);
  restoreProperty(navigator, "mediaDevices", originalMediaDevices);
  restoreProperty(window, "requestAnimationFrame", originalRequestAnimationFrame);
});

describe("VoicePoweredOrb lifecycle", () => {
  it("requests microphone access only after voice control is enabled", async () => {
    const pendingStream = deferred<MediaStream>();
    getUserMedia.mockReturnValue(pendingStream.promise);

    const view = render(<VoicePoweredOrb enableVoiceControl={false} />);

    await act(async () => {});
    expect(getUserMedia).not.toHaveBeenCalled();

    view.rerender(<VoicePoweredOrb enableVoiceControl />);

    await waitFor(() => {
      expect(getUserMedia).toHaveBeenCalledOnce();
    });
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });

    view.unmount();
    const lateStream = createStream();
    await act(async () => {
      pendingStream.resolve(lateStream.stream);
      await pendingStream.promise;
    });
  });

  it("releases microphone and audio resources when voice control is disabled", async () => {
    const { stream, tracks } = createStream();
    getUserMedia.mockResolvedValue(stream);
    const audio = installAudioContext();

    const view = render(<VoicePoweredOrb enableVoiceControl />);
    await waitFor(() => {
      expect(audio.construct).toHaveBeenCalledOnce();
      expect(requestAnimationFrameMock).toHaveBeenCalledTimes(2);
    });
    const audioFrame = requestAnimationFrameMock.mock.results[1].value;

    view.rerender(<VoicePoweredOrb enableVoiceControl={false} />);

    for (const track of tracks) expect(track.stop).toHaveBeenCalledOnce();
    expect(audio.source.disconnect).toHaveBeenCalledOnce();
    expect(audio.analyser.disconnect).toHaveBeenCalledOnce();
    expect(audio.close).toHaveBeenCalledOnce();
    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(audioFrame);

    view.unmount();
  });

  it("releases all audio, listener, canvas, animation, and WebGL resources on direct unmount", async () => {
    const { stream, tracks } = createStream();
    getUserMedia.mockResolvedValue(stream);
    const audio = installAudioContext();
    const addWindowListener = vi.spyOn(window, "addEventListener");
    const removeWindowListener = vi.spyOn(window, "removeEventListener");

    const view = render(<VoicePoweredOrb enableVoiceControl />);
    const canvas = view.container.querySelector("canvas");
    expect(canvas).not.toBeNull();
    await waitFor(() => {
      expect(audio.construct).toHaveBeenCalledOnce();
      expect(requestAnimationFrameMock).toHaveBeenCalledTimes(2);
    });
    const renderFrame = requestAnimationFrameMock.mock.results[0].value;
    const audioFrame = requestAnimationFrameMock.mock.results[1].value;
    const resizeListener = addWindowListener.mock.calls.find(([event]) => event === "resize")?.[1];
    const motionListener = matchMediaAdd.mock.calls.find(([event]) => event === "change")?.[1];
    expect(resizeListener).toEqual(expect.any(Function));
    expect(motionListener).toEqual(expect.any(Function));

    view.unmount();

    for (const track of tracks) expect(track.stop).toHaveBeenCalledOnce();
    expect(audio.source.disconnect).toHaveBeenCalledOnce();
    expect(audio.analyser.disconnect).toHaveBeenCalledOnce();
    expect(audio.close).toHaveBeenCalledOnce();
    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(audioFrame);
    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(renderFrame);
    expect(removeWindowListener).toHaveBeenCalledWith("resize", resizeListener);
    expect(matchMediaRemove).toHaveBeenCalledWith("change", motionListener);
    expect(canvas?.isConnected).toBe(false);
    expect(oglMocks.programRemove).toHaveBeenCalledOnce();
    expect(oglMocks.getExtension).toHaveBeenCalledWith("WEBGL_lose_context");
    expect(oglMocks.loseContext).toHaveBeenCalledOnce();
  });

  it.each(["disable", "unmount"] as const)(
    "stops a late stream after %s without starting audio analysis",
    async (cleanupMode) => {
      const pendingStream = deferred<MediaStream>();
      getUserMedia.mockReturnValue(pendingStream.promise);
      const audio = installAudioContext();
      const view = render(<VoicePoweredOrb enableVoiceControl />);

      await waitFor(() => expect(getUserMedia).toHaveBeenCalledOnce());
      const frameRequestsBeforeResolution = requestAnimationFrameMock.mock.calls.length;

      if (cleanupMode === "disable") {
        view.rerender(<VoicePoweredOrb enableVoiceControl={false} />);
      } else {
        view.unmount();
      }

      const lateStream = createStream();
      await act(async () => {
        pendingStream.resolve(lateStream.stream);
        await pendingStream.promise;
      });

      for (const track of lateStream.tracks) expect(track.stop).toHaveBeenCalledOnce();
      expect(audio.construct).not.toHaveBeenCalled();
      expect(requestAnimationFrameMock).toHaveBeenCalledTimes(frameRequestsBeforeResolution);
    },
  );
});
