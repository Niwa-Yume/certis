import { canonicalJson } from './canonical-json';

// Clés et chaînes données en unités UTF-16 pour qu'aucun outil ne les normalise.
const text = (...units: number[]) => String.fromCharCode(...units);

// Exemples tirés de RFC 8785, sections 3.2.2 et 3.2.3.
describe('canonicalJson (RFC 8785)', () => {
  it('serializes literals, numbers and strings like the RFC sample', () => {
    const input = {
      numbers: [
        // Littéral du RFC : la perte de précision est précisément ce qui est testé.
        // eslint-disable-next-line no-loss-of-precision
        333333333.33333329,
        1e30, 4.5, 2e-3, 0.000000000000000000000000001,
      ],
      // € $ U+000F \n A ' B " \ \ " /
      string: text(
        0x20ac,
        0x24,
        0x0f,
        0x0a,
        0x41,
        0x27,
        0x42,
        0x22,
        0x5c,
        0x5c,
        0x22,
        0x2f,
      ),
      literals: [null, true, false],
    };

    expect(canonicalJson(input)).toBe(
      `{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],"string":"${text(0x20ac)}$\\u000f\\nA'B\\"\\\\\\\\\\"/"}`,
    );
  });

  it('sorts keys by UTF-16 code units', () => {
    const rfcOrder = [
      text(0x0d), // Carriage Return
      text(0x31), // "1"
      text(0x80), // Control
      text(0xf6), // Latin Small Letter O With Diaeresis
      text(0x20ac), // Euro Sign
      text(0xd83d, 0xde00), // Emoji: Grinning Face (paire de substitution)
      text(0xfb33), // Hebrew Letter Dalet With Dagesh
    ];
    const input = Object.fromEntries(
      [...rfcOrder].reverse().map((key, index) => [key, index]),
    );
    const expected = rfcOrder
      .map((key) => `${JSON.stringify(key)}:${input[key]}`)
      .join(',');

    expect(canonicalJson(input)).toBe(`{${expected}}`);
  });

  it('ignores undefined fields and rejects non-finite numbers', () => {
    expect(canonicalJson({ b: 1, a: undefined })).toBe('{"b":1}');
    expect(() => canonicalJson({ a: NaN })).toThrow();
  });
});
