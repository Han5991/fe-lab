import { css } from '@design-system/ui-lib/css';
import { Label } from './Label';

export const Hero = () => {
  return (
    <header
      className={css({
        pt: { base: '[32px]', md: '[48px]' },
        pb: { base: '[24px]', md: '[32px]' },
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
            mb: '[12px]',
            color: 'ink.500',
            letterSpacing: 'mono',
          })}
        >
          STUDY NOTE / 한상욱 · since 2025
        </Label>
        <h1
          className={css({
            fontFamily: 'sans',
            fontSize: { base: '4xl', md: '[40px]', lg: '[48px]' },
            fontWeight: 'bold',
            lineHeight: 'heroDense',
            letterSpacing: 'tight',
            color: 'ink.950',
            mb: '[12px]',
          })}
        >
          그냥,
          <br />
          <span>적어 두는</span> 공부방.
        </h1>
        <p
          className={css({
            fontFamily: 'sans',
            fontSize: { base: 'md', md: 'lg' },
            color: 'ink.600',
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
