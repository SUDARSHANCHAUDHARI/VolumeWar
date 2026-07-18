(function startVolumeWar() {
  "use strict";

  const {
    ATTEMPT_LIMIT,
    INITIAL_VOLUME,
    attemptVolumeChange,
    clearReaction,
    createInitialState,
    setAudioStatus
  } = window.VolumeWarState;

  const elements = {
    stage: document.querySelector(".battle-stage"),
    characterBay: document.querySelector("#characterBay"),
    controlDeck: document.querySelector("#controlDeck"),
    taunt: document.querySelector("#taunt"),
    volumeReadout: document.querySelector("#volumeReadout"),
    volumeSlider: document.querySelector("#volumeSlider"),
    primarySliderGroup: document.querySelector("#primarySliderGroup"),
    directionLabel: document.querySelector("#directionLabel"),
    secondSliderWrap: document.querySelector("#secondSliderWrap"),
    secondSlider: document.querySelector("#secondSlider"),
    muteButton: document.querySelector("#muteButton"),
    muteButtonLabel: document.querySelector("#muteButton span"),
    attemptCount: document.querySelector("#attemptCount"),
    attemptMeter: document.querySelector("#attemptMeter"),
    attemptSegments: [...document.querySelectorAll("#attemptMeter span")],
    battleStatus: document.querySelector("#battleStatus"),
    soundState: document.querySelector("#soundState"),
    soundStateLabel: document.querySelector("#soundStateLabel"),
    startButton: document.querySelector("#startButton"),
    stopButton: document.querySelector("#stopButton"),
    resetButton: document.querySelector("#resetButton")
  };

  class SafeSynth {
    static MAX_GAIN = 0.08;

    constructor() {
      this.context = null;
      this.masterGain = null;
      this.oscillators = [];
      this.fakeMuteTimer = null;
    }

    get running() {
      return Boolean(this.context && this.context.state !== "closed");
    }

    gainForVolume(volume, muted = false) {
      if (muted || volume <= 0) {
        return 0.0001;
      }

      const normalized = Math.max(0, Math.min(1, volume / 100));
      return Math.max(0.0001, SafeSynth.MAX_GAIN * Math.pow(normalized, 1.5));
    }

    async start(volume, muted) {
      if (this.running) {
        await this.context.resume();
        this.setVolume(volume, muted);
        return;
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("This browser does not support the Web Audio API.");
      }

      const context = new AudioContextClass();
      const masterGain = context.createGain();
      const filter = context.createBiquadFilter();
      const mixGain = context.createGain();

      masterGain.gain.setValueAtTime(0.0001, context.currentTime);
      mixGain.gain.setValueAtTime(0.42, context.currentTime);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(720, context.currentTime);
      filter.Q.setValueAtTime(2.4, context.currentTime);

      mixGain.connect(filter);
      filter.connect(masterGain);
      masterGain.connect(context.destination);

      const notes = [110, 138.59, 164.81];
      this.oscillators = notes.map((frequency, index) => {
        const oscillator = context.createOscillator();
        const voiceGain = context.createGain();
        oscillator.type = index === 0 ? "triangle" : "sine";
        oscillator.frequency.setValueAtTime(frequency, context.currentTime);
        oscillator.detune.setValueAtTime(index === 2 ? 5 : 0, context.currentTime);
        voiceGain.gain.setValueAtTime(index === 0 ? 0.34 : 0.22, context.currentTime);
        oscillator.connect(voiceGain);
        voiceGain.connect(mixGain);
        oscillator.start();
        return oscillator;
      });

      const pulse = context.createOscillator();
      const pulseDepth = context.createGain();
      pulse.type = "sine";
      pulse.frequency.setValueAtTime(1.8, context.currentTime);
      pulseDepth.gain.setValueAtTime(180, context.currentTime);
      pulse.connect(pulseDepth);
      pulseDepth.connect(filter.frequency);
      pulse.start();
      this.oscillators.push(pulse);

      this.context = context;
      this.masterGain = masterGain;
      await context.resume();
      this.setVolume(volume, muted, 0.12);
    }

    setVolume(volume, muted = false, rampSeconds = 0.06) {
      if (!this.running || !this.masterGain) {
        return;
      }

      const now = this.context.currentTime;
      const gain = this.gainForVolume(volume, muted);
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
      this.masterGain.gain.exponentialRampToValueAtTime(gain, now + rampSeconds);
    }

    fakeMuteThenReturn(volume) {
      if (!this.running) {
        return;
      }

      window.clearTimeout(this.fakeMuteTimer);
      this.setVolume(0, true, 0.04);
      this.fakeMuteTimer = window.setTimeout(() => {
        this.setVolume(volume, false, 0.14);
        this.fakeMuteTimer = null;
      }, 360);
    }

    async stop() {
      window.clearTimeout(this.fakeMuteTimer);
      this.fakeMuteTimer = null;
      if (!this.running) {
        this.context = null;
        this.masterGain = null;
        this.oscillators = [];
        return;
      }

      const context = this.context;
      try {
        const now = context.currentTime;
        if (this.masterGain) {
          this.masterGain.gain.cancelScheduledValues(now);
          this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
          this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        }

        await new Promise((resolve) => window.setTimeout(resolve, 100));
        this.oscillators.forEach((oscillator) => {
          try {
            oscillator.stop();
          } catch (error) {
            // An already-stopped oscillator needs no further cleanup.
          }
        });

        if (context.state !== "closed") {
          await context.close();
        }
      } finally {
        if (this.context === context) {
          this.context = null;
          this.masterGain = null;
          this.oscillators = [];
        }
      }
    }
  }

  const synth = new SafeSynth();
  let state = createInitialState();
  let reactionTimer = null;
  let reactionLocked = false;

  function effectiveMinimum() {
    return state.unlocked ? 0 : state.minimumVolume;
  }

  function sliderPosition(volume) {
    const minimum = effectiveMinimum();
    const span = Math.max(1, 100 - minimum);
    const normalized = ((volume - minimum) / span) * 100;
    return state.reversed ? 100 - normalized : normalized;
  }

  function updateSlider(slider) {
    const minimum = effectiveMinimum();
    slider.min = String(minimum);
    slider.value = String(Math.max(minimum, state.volume));
    slider.dir = state.reversed ? "rtl" : "ltr";
    slider.style.setProperty("--slider-position", `${sliderPosition(state.volume)}%`);
    slider.setAttribute(
      "aria-valuetext",
      `${state.volume} percent${state.reversed ? ", visual direction reversed" : ""}`
    );
  }

  function render(previousState = state) {
    const displayedVolume = state.unlocked
      ? state.volume
      : Math.min(199, state.volume + state.displayBoost);
    const isRunning = state.audioStatus === "running";
    const isBusy = state.audioStatus === "starting" || state.audioStatus === "stopping";

    elements.volumeReadout.textContent = `${displayedVolume}%`;
    elements.volumeReadout.classList.toggle("is-inflated", state.displayBoost > 0 && !state.unlocked);
    elements.taunt.textContent = state.message;
    elements.battleStatus.textContent = state.message;

    updateSlider(elements.volumeSlider);
    updateSlider(elements.secondSlider);
    elements.primarySliderGroup.classList.toggle("is-reversed", state.reversed);
    elements.secondSliderWrap.classList.toggle("is-reversed", state.reversed);
    elements.directionLabel.textContent = state.reversed ? "Direction: reversed" : "Direction: normal";

    elements.secondSliderWrap.hidden = !state.secondSlider;
    elements.muteButton.hidden = state.muteHidden;
    elements.muteButtonLabel.textContent = state.isMuted ? "Unmute" : "Mute";
    elements.muteButton.setAttribute("aria-pressed", String(state.isMuted));

    elements.attemptCount.textContent = `${state.attempts} / ${ATTEMPT_LIMIT}`;
    elements.attemptMeter.setAttribute("aria-valuenow", String(state.attempts));
    elements.attemptSegments.forEach((segment, index) => {
      segment.classList.toggle("is-filled", index < state.attempts);
    });

    elements.stage.classList.toggle("is-running", isRunning);
    elements.stage.classList.toggle("is-grabbing", state.grabbing);
    elements.stage.classList.toggle("is-bars-pushing", state.barsPushing);
    elements.stage.classList.toggle("is-fake-muting", state.fakeMuting);
    elements.stage.classList.toggle("is-unlocked", state.unlocked);
    elements.stage.dataset.reaction = state.reaction || "none";

    elements.startButton.disabled = isRunning || isBusy;
    elements.stopButton.disabled = !isRunning || isBusy;
    elements.resetButton.disabled = isBusy;
    elements.soundState.classList.toggle("is-on", isRunning);
    elements.soundStateLabel.textContent = isRunning ? "Sound on" : isBusy ? "Working…" : "Sound off";

    if (previousState.muteHidden === false && state.muteHidden && document.activeElement === elements.muteButton) {
      window.requestAnimationFrame(() => elements.volumeSlider.focus());
    }
  }

  function scheduleReactionCleanup() {
    window.clearTimeout(reactionTimer);
    reactionTimer = window.setTimeout(() => {
      const previousState = state;
      state = clearReaction(state);
      reactionLocked = false;
      render(previousState);
    }, state.unlocked ? 900 : 1250);
  }

  function requestVolume(requestedVolume) {
    const numericRequest = Number(requestedVolume);
    if (!Number.isFinite(numericRequest)) {
      return;
    }

    if (reactionLocked && numericRequest < state.volume) {
      render(state);
      return;
    }

    const previousState = state;
    state = attemptVolumeChange(state, numericRequest);
    const registeredAttempt = state.attempts > previousState.attempts;

    if (registeredAttempt) {
      reactionLocked = true;
      scheduleReactionCleanup();
    }

    render(previousState);

    if (state.fakeMuting) {
      synth.fakeMuteThenReturn(state.volume);
    } else {
      synth.setVolume(state.volume, state.isMuted);
    }
  }

  function handleSliderInput(event) {
    requestVolume(event.currentTarget.value);
  }

  function handleSliderKeyboard(event) {
    const keyActions = {
      ArrowLeft: -1,
      ArrowDown: -1,
      ArrowRight: 1,
      ArrowUp: 1,
      PageDown: -10,
      PageUp: 10
    };

    let nextVolume;
    if (Object.prototype.hasOwnProperty.call(keyActions, event.key)) {
      nextVolume = state.volume + keyActions[event.key];
    } else if (event.key === "Home") {
      nextVolume = effectiveMinimum();
    } else if (event.key === "End") {
      nextVolume = 100;
    } else {
      return;
    }

    event.preventDefault();
    requestVolume(Math.max(effectiveMinimum(), Math.min(100, nextVolume)));
  }

  async function startSound() {
    if (state.audioStatus !== "stopped") {
      return;
    }

    let previousState = state;
    state = setAudioStatus(state, "starting");
    render(previousState);

    try {
      await synth.start(state.volume, state.isMuted);
      previousState = state;
      state = setAudioStatus(state, "running");
      state = { ...state, message: "Sound is on. Go ahead—try to turn me down." };
      render(previousState);
    } catch (error) {
      try {
        await synth.stop();
      } catch (cleanupError) {
        // The UI still recovers if browser-level audio cleanup fails.
      }
      previousState = state;
      state = setAudioStatus(state, "stopped");
      state = { ...state, message: error.message || "Sound could not start in this browser." };
      render(previousState);
    }
  }

  async function stopSound() {
    if (state.audioStatus !== "running") {
      return;
    }

    let previousState = state;
    state = setAudioStatus(state, "stopping");
    render(previousState);
    let stopMessage = "Sound stopped. The battle state is still waiting for you.";
    try {
      await synth.stop();
    } catch (error) {
      stopMessage = "Sound was silenced, but the browser reported a cleanup problem. You can safely reset and try again.";
    }
    previousState = state;
    state = setAudioStatus(state, "stopped");
    state = { ...state, message: stopMessage };
    render(previousState);
  }

  async function resetBattle() {
    window.clearTimeout(reactionTimer);
    reactionLocked = false;

    const previousState = state;
    if (synth.running) {
      state = setAudioStatus(state, "stopping");
      render(previousState);
      try {
        await synth.stop();
      } catch (error) {
        // Reset remains available because stop() already clears local audio references.
      }
    }

    state = createInitialState();
    render(previousState);
    elements.startButton.focus();
  }

  elements.volumeSlider.addEventListener("input", handleSliderInput);
  elements.volumeSlider.addEventListener("keydown", handleSliderKeyboard);
  elements.secondSlider.addEventListener("input", handleSliderInput);
  elements.secondSlider.addEventListener("keydown", handleSliderKeyboard);

  elements.muteButton.addEventListener("click", () => {
    requestVolume(state.isMuted ? state.lastNonZeroVolume || INITIAL_VOLUME : 0);
  });
  elements.startButton.addEventListener("click", startSound);
  elements.stopButton.addEventListener("click", stopSound);
  elements.resetButton.addEventListener("click", resetBattle);

  render();
})();
