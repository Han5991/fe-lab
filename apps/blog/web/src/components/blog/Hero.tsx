import { css } from '@design-system/ui-lib/css';
import { RSS_PATH, SITE_AUTHOR_GITHUB } from '@/lib/constants';

/** 히어로 pill — 이름 아래 외부 채널. 레퍼런스 `.pill` 수치 그대로. */
const pill = css({
  fontFamily: 'mono',
  fontWeight: 'normal',
  fontSize: '[12px]',
  color: 'ink.600',
  borderWidth: 'hairline',
  borderStyle: 'solid',
  borderColor: 'ink.border',
  rounded: 'pill',
  px: '[11px]',
  py: '[3px]',
  transition: '[color 0.15s, border-color 0.15s]',
  _hover: { color: 'ink.950', borderColor: 'ink.borderStrong' },
});

// 레퍼런스에는 velog pill도 있지만 크로스포스팅을 접기로 해서 뺐다.
const PILLS = [
  { href: SITE_AUTHOR_GITHUB, label: 'github', external: true },
  // RSS는 같은 도메인의 정적 파일이라 새 탭으로 열지 않는다.
  { href: RSS_PATH, label: 'rss', external: false },
] as const;

export const Hero = () => {
  return (
    // <header>로 감싸면 Chrome이 main 안에서도 banner 랜드마크로 노출해
    // 사이트 헤더와 banner가 둘이 된다(axe: no-duplicate-banner). 그냥 div.
    //
    // 레퍼런스는 우측 210px에 장식 다이어그램 모티프를 뒀지만 걷어냈다.
    // `aria-hidden` 장식이라 정보가 0인데, 정작 다이어그램이 의미를 갖는 자리
    // (글 히어로·본문)와 언어가 겹쳐 그쪽 무게를 깎았다. 다이어그램은 글 안에서만
    // 쓴다.
    <div className={css({ mb: '[30px]' })}>
      <div>
        <h1
          className={css({
            fontSize: '[21px]',
            fontWeight: 'bold',
            color: 'ink.950',
            mb: '[8px]',
          })}
        >
          한상욱
        </h1>
        <p className={css({ fontSize: '[14px]', color: 'ink.600' })}>
          구조를 그려서 문제를 푸는 프론트엔드 엔지니어.
          <br />
          디자인 시스템, 모노레포, 배포 파이프라인을 다룹니다.
        </p>
        <div
          className={css({
            display: 'flex',
            flexWrap: 'wrap',
            gap: '[8px]',
            mt: '[14px]',
          })}
        >
          {PILLS.map(item => (
            <a
              key={item.label}
              href={item.href}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noopener noreferrer' : undefined}
              className={pill}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
