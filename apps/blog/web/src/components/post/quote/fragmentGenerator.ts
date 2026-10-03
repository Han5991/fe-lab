import type { TextFragment } from './textFragment';

/** 선택 범위 → 텍스트 조각. 이 범위를 유일하게 가리키는 조각을 못 만들면 null. */
export type FragmentGenerator = (range: Range) => TextFragment | null;

/**
 * Chrome의 "강조 표시 링크 복사"와 같은 생성기(GoogleChromeLabs/text-fragments-polyfill)를
 * 처음 쓸 때 받는다(gzip 약 7KB). 직접 짜지 않는 이유는 조각이 맞아야 하는
 * 조건이 까다로워서다 — 브라우저는 단어 경계에서만 맞추고(한국어는
 * Intl.Segmenter), 페이지의 **첫** 일치로 가므로 같은 문장이 위에 또 있으면
 * 앞뒤 문맥(prefix·suffix)을 붙여야 한다. 그 판정을 이 라이브러리가 한다.
 */
export const loadFragmentGenerator = (): Promise<FragmentGenerator> =>
  import('text-fragments-polyfill/dist/fragment-generation-utils.js').then(
    ({
      GenerateFragmentStatus,
      generateFragmentFromRange,
      isValidRangeForFragmentGeneration,
    }) =>
      (range: Range) => {
        if (!isValidRangeForFragmentGeneration(range)) return null;
        const result = generateFragmentFromRange(range);
        return result.status === GenerateFragmentStatus.SUCCESS &&
          result.fragment
          ? recompose(result.fragment)
          : null;
      },
  );

const nfc = (term: string | undefined) => term?.normalize('NFC');

/**
 * 라이브러리는 비교용으로 정규화한 글자(NFKD 분해 + 소문자)를 그대로 조각에
 * 싣는다. 소문자는 괜찮지만(브라우저는 대소문자를 가리지 않고 맞춘다) 한글은
 * 자모로 쪼개져 — `씩`이 `ㅆ`·`ㅣ`·`ㄱ` 세 글자가 된다 — 링크가 두 배로 길어지고,
 * 브라우저가 쪼개진 자모를 페이지의 완성형 음절과 같다고 볼지도 장담할 수
 * 없다. 페이지에 실제로 있는 모양(NFC)으로 되돌려 싣는다.
 */
function recompose(fragment: TextFragment): TextFragment {
  return {
    textStart: fragment.textStart.normalize('NFC'),
    textEnd: nfc(fragment.textEnd),
    prefix: nfc(fragment.prefix),
    suffix: nfc(fragment.suffix),
  };
}
