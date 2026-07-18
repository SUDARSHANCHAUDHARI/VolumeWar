const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ATTEMPT_LIMIT,
  INITIAL_VOLUME,
  TRICK_IDS,
  attemptVolumeChange,
  clearReaction,
  createInitialState,
  shuffledTricks
} = require("../game-state.js");

const predictableRandom = () => 0.25;

test("initial state is quiet, locked, and ready at the documented volume", () => {
  const state = createInitialState(predictableRandom);

  assert.equal(state.volume, INITIAL_VOLUME);
  assert.equal(state.audioStatus, "stopped");
  assert.equal(state.attempts, 0);
  assert.equal(state.unlocked, false);
  assert.deepEqual([...state.trickQueue].sort(), [...TRICK_IDS].sort());
});

test("the trick bag is a permutation of all sabotage behaviors", () => {
  const tricks = shuffledTricks(() => 0.6);

  assert.equal(tricks.length, TRICK_IDS.length);
  assert.equal(new Set(tricks).size, TRICK_IDS.length);
  assert.deepEqual([...tricks].sort(), [...TRICK_IDS].sort());
});

test("raising the volume is accepted without spending an attempt", () => {
  const state = createInitialState(predictableRandom);
  const nextState = attemptVolumeChange(state, 90, predictableRandom);

  assert.equal(nextState.volume, 90);
  assert.equal(nextState.attempts, 0);
  assert.match(nextState.message, /Louder/);
});

test("a lowering request triggers the queued trick and counts one attempt", () => {
  const state = {
    ...createInitialState(predictableRandom),
    trickQueue: ["cant-hear", ...TRICK_IDS.filter((trick) => trick !== "cant-hear")]
  };
  const nextState = attemptVolumeChange(state, 20, predictableRandom);

  assert.equal(nextState.volume, INITIAL_VOLUME);
  assert.equal(nextState.attempts, 1);
  assert.equal(nextState.reaction, "cant-hear");
  assert.match(nextState.message, /can’t hear you/);
});

test("every sabotage behavior mutates its intended piece of state", async (t) => {
  const expectations = {
    "push-back": (state) => assert.ok(state.volume > INITIAL_VOLUME),
    "hide-mute": (state) => assert.equal(state.muteHidden, true),
    "inflate-display": (state) => assert.ok(state.displayBoost > 0),
    "grab-slider": (state) => assert.equal(state.grabbing, true),
    "reverse-slider": (state) => assert.equal(state.reversed, true),
    "raise-minimum": (state) => assert.ok(state.minimumVolume > 0),
    "second-slider": (state) => assert.equal(state.secondSlider, true),
    "cant-hear": (state) => assert.match(state.message, /can’t hear you/),
    "bars-push": (state) => assert.equal(state.barsPushing, true),
    "fake-mute": (state) => assert.equal(state.fakeMuting, true)
  };

  for (const trick of TRICK_IDS) {
    await t.test(trick, () => {
      const state = {
        ...createInitialState(predictableRandom),
        trickQueue: [trick, ...TRICK_IDS.filter((candidate) => candidate !== trick)]
      };
      const nextState = attemptVolumeChange(state, 20, predictableRandom);

      assert.equal(nextState.reaction, trick);
      expectations[trick](nextState);
    });
  }
});

test("mute is treated as a lowering request until the battle is won", () => {
  const state = createInitialState(predictableRandom);
  const nextState = attemptVolumeChange(state, 0, predictableRandom);

  assert.equal(nextState.attempts, 1);
  assert.equal(nextState.isMuted, false);
  assert.notEqual(nextState.volume, 0);
});

test("ten refused requests unlock zero, and the next request reaches it", () => {
  let state = createInitialState(predictableRandom);

  for (let attempt = 0; attempt < ATTEMPT_LIMIT; attempt += 1) {
    state = attemptVolumeChange(state, Math.max(0, state.volume - 1), predictableRandom);
    state = clearReaction(state);
  }

  assert.equal(state.attempts, ATTEMPT_LIMIT);
  assert.equal(state.unlocked, true);
  assert.equal(state.minimumVolume, 0);

  state = attemptVolumeChange(state, 0, predictableRandom);
  assert.equal(state.volume, 0);
  assert.equal(state.isMuted, true);
  assert.equal(state.attempts, ATTEMPT_LIMIT);
});

test("unlocked requests are clamped to the valid range", () => {
  const state = { ...createInitialState(predictableRandom), unlocked: true, attempts: ATTEMPT_LIMIT };

  assert.equal(attemptVolumeChange(state, -50, predictableRandom).volume, 0);
  assert.equal(attemptVolumeChange(state, 500, predictableRandom).volume, 100);
});
