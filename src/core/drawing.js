const UINT32_RANGE = 2 ** 32;

/** Rejection sampling avoids the bias of taking an arbitrary uint32 modulo max. */
export function randomIndex(max, cryptoSource = globalThis.crypto) {
  if (!Number.isInteger(max) || max < 1 || max > UINT32_RANGE) {
    throw new RangeError('随机范围无效');
  }

  const buffer = new Uint32Array(1);
  const limit = UINT32_RANGE - (UINT32_RANGE % max);
  do {
    cryptoSource.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % max;
}

/** Return a new reading without changing the catalogue or repeating a card. */
export function drawCards(deck, count, includeReversed, pickIndex = randomIndex) {
  if (!Array.isArray(deck) || !Number.isInteger(count) || count < 1 ||
      count > deck.length || typeof includeReversed !== 'boolean') {
    throw new TypeError('抽牌数量或逆位设置无效');
  }

  const available = [...deck];
  return Array.from({ length: count }, () => ({
    card: available.splice(pickIndex(available.length), 1)[0],
    reverse: includeReversed && pickIndex(2) === 1,
  }));
}

export function describeReading(spread, reading) {
  return reading.map(({ card, reverse }, index) => ({
    id: card.id,
    name: card.name,
    position: spread.positions[index].name,
    positionNumber: index + 1,
    orientation: reverse ? 'reversed' : 'upright',
  }));
}
