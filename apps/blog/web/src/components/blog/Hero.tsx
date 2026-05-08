import { css } from '@design-system/ui-lib/css';
import { Label } from './Label';

export const Hero = () => {
  return (
    <header
      className={css({
        pt: { base: '12', md: '20' },
        pb: { base: '10', md: '14' },
      })}
    >
      <div className={css({ maxW: '1200px', mx: 'auto', px: '8' })}>
        <Label
          tone="meta"
          className={css({
            display: 'block',
            mb: '5',
            color: 'ink.500',
            letterSpacing: '0.16em',
          })}
        >
          STUDY NOTE / 한상욱 · since 2023
        </Label>
        <h1
          className={css({
            fontFamily: 'serif',
            fontSize: { base: '5xl', md: '7xl', lg: '88px' },
            fontWeight: '400',
            lineHeight: '0.95',
            letterSpacing: '-0.03em',
            color: 'ink.950',
            mb: '4',
          })}
        >
          그냥,
          <br />
          <span className={css({ fontStyle: 'italic' })}>적어 두는</span> 공부방.
        </h1>
        <p
          className={css({
            fontFamily: 'serif',
            fontSize: { base: 'lg', md: 'xl' },
            color: 'ink.700',
            maxW: '580px',
            lineHeight: '1.55',
          })}
        >
          아직 정리되지 않은 생각과, 내일이면 다시 계산해볼 코드 조각들. 회사에서
          번들러 소스를 떠돌다 뜨게 알게 된 내용이 주로 살고 있습니다.
        </p>
      </div>
    </header>
  );
};
