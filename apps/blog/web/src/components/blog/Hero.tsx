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
      <div
        className={css({
          maxW: 'containerW',
          mx: 'auto',
          px: '8',
        })}
      >
        <Label
          tone="meta"
          className={css({
            display: 'block',
            mb: '5',
            color: 'ink.500',
            letterSpacing: 'monoXxxl',
          })}
        >
          STUDY NOTE / 한상욱 · since 2025
        </Label>
        <h1
          className={css({
            fontFamily: 'serif',
            fontSize: { base: '5xl', md: '7xl', lg: '[88px]' },
            fontWeight: 'normal',
            lineHeight: 'heroDense',
            letterSpacing: 'tighter',
            color: 'ink.950',
            mb: '4',
          })}
        >
          그냥,
          <br />
          <span className={css({ fontStyle: 'italic' })}>적어 두는</span>{' '}
          공부방.
        </h1>
        <p
          className={css({
            fontFamily: 'serif',
            fontSize: { base: 'lg', md: 'xl' },
            color: 'ink.700',
            maxW: 'heroSubW',
            lineHeight: 'comfortable',
          })}
        >
          아직 정리되지 않은 생각과, 내일이면 다시 계산해볼 코드 조각들. 날마다
          코드 사이에서 마주치는 문제와 고민을 그대로 적어 둡니다.
        </p>
      </div>
    </header>
  );
};
