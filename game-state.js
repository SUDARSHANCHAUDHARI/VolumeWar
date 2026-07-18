(function exposeVolumeWarState(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.VolumeWarState = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createVolumeWarStateApi() {
  "use strict";

  const INITIAL_VOLUME = 72;
  const ATTEMPT_LIMIT = 10;

  const TRICK_IDS = Object.freeze([
    "push-back",
    "hide-mute",
    "inflate-display",
    "grab-slider",
    "reverse-slider",
    "raise-minimum",
    "second-slider",
    "cant-hear",
    "bars-push",
    "fake-mute"
  ]);

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function randomInteger(random, minimum, maximum) {
    return Math.floor(random() * (maximum - minimum + 1)) + minimum;
  }

  function shuffledTricks(random) {
    const tricks = [...TRICK_IDS];

    for (let index = tricks.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [tricks[index], tricks[swapIndex]] = [tricks[swapIndex], tricks[index]];
    }

    return tricks;
  }

  function createInitialState(random = Math.random) {
    return {
      attempts: 0,
      unlocked: false,
      volume: INITIAL_VOLUME,
      lastNonZeroVolume: INITIAL_VOLUME,
      displayBoost: 0,
      minimumVolume: 0,
      reversed: false,
      secondSlider: false,
      muteHidden: false,
      isMuted: false,
      audioStatus: "stopped",
      reaction: null,
      reactionSequence: 0,
      grabbing: false,
      barsPushing: false,
      fakeMuting: false,
      trickQueue: shuffledTricks(random),
      message: "No attempts yet. The speaker is watching."
    };
  }

  function clearReaction(state) {
    return {
      ...state,
      reaction: null,
      grabbing: false,
      barsPushing: false,
      fakeMuting: false,
      muteHidden: false
    };
  }

  function applyTrick(state, trick, random) {
    const louderBy = (minimum, maximum) =>
      clamp(state.volume + randomInteger(random, minimum, maximum), 0, 100);

    switch (trick) {
      case "push-back":
        return {
          ...state,
          volume: louderBy(10, 18),
          message: "Nice try. I put the slider back where it belongs."
        };
      case "hide-mute":
        return {
          ...state,
          muteHidden: true,
          message: "Mute button? What mute button?"
        };
      case "inflate-display":
        return {
          ...state,
          displayBoost: state.displayBoost + randomInteger(random, 14, 28),
          message: "Your number looked a little small, so I fixed it."
        };
      case "grab-slider":
        return {
          ...state,
          volume: louderBy(6, 13),
          grabbing: true,
          message: "Hands off. This slider is mine."
        };
      case "reverse-slider":
        return {
          ...state,
          reversed: !state.reversed,
          message: "Left is right now. Keep up."
        };
      case "raise-minimum": {
        const minimumVolume = randomInteger(random, 28, 52);
        return {
          ...state,
          minimumVolume,
          volume: Math.max(state.volume, minimumVolume),
          message: `New house rule: nothing below ${minimumVolume}%.`
        };
      }
      case "second-slider":
        return {
          ...state,
          secondSlider: true,
          message: "You seemed confused, so I added another slider."
        };
      case "cant-hear":
        return {
          ...state,
          message: "I can’t hear you. Try being louder."
        };
      case "bars-push":
        return {
          ...state,
          volume: louderBy(8, 16),
          barsPushing: true,
          message: "Even the music bars are on my side."
        };
      case "fake-mute":
        return {
          ...state,
          volume: louderBy(12, 20),
          fakeMuting: true,
          message: "Muted! Just kidding. I came back louder."
        };
      default:
        return state;
    }
  }

  function attemptVolumeChange(state, requestedVolume, random = Math.random) {
    const numericRequest = Number(requestedVolume);
    if (!Number.isFinite(numericRequest)) {
      return state;
    }

    const requested = clamp(Math.round(numericRequest), 0, 100);
    const baseState = clearReaction(state);

    if (requested === state.volume) {
      return baseState;
    }

    if (requested > state.volume || state.unlocked) {
      return {
        ...baseState,
        volume: requested,
        lastNonZeroVolume: requested > 0 ? requested : state.lastNonZeroVolume,
        isMuted: requested === 0,
        message: requested === 0
          ? "Zero. At last, the room is quiet."
          : state.unlocked
            ? "You won. The volume is finally yours."
            : "Louder? Now you’re speaking my language."
      };
    }

    const nextAttempt = Math.min(state.attempts + 1, ATTEMPT_LIMIT);
    const trick = state.trickQueue[nextAttempt - 1] || TRICK_IDS[0];
    const trickState = applyTrick({
      ...baseState,
      attempts: nextAttempt,
      reaction: trick,
      reactionSequence: state.reactionSequence + 1,
      isMuted: false
    }, trick, random);

    if (nextAttempt === ATTEMPT_LIMIT) {
      return {
        ...trickState,
        unlocked: true,
        minimumVolume: 0,
        displayBoost: 0,
        muteHidden: false,
        message: `${trickState.message} Fine—you win. Zero is unlocked.`
      };
    }

    return trickState;
  }

  function setAudioStatus(state, audioStatus) {
    if (!["stopped", "starting", "running", "stopping"].includes(audioStatus)) {
      return state;
    }

    return { ...state, audioStatus };
  }

  return Object.freeze({
    ATTEMPT_LIMIT,
    INITIAL_VOLUME,
    TRICK_IDS,
    attemptVolumeChange,
    clearReaction,
    createInitialState,
    setAudioStatus,
    shuffledTricks
  });
});
