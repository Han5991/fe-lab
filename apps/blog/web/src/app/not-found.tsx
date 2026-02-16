import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';

export default function NotFound() {
    return (
        <div
            className={css({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minH: '60vh',
                px: '6',
                textAlign: 'center',
            })}
        >
            <p
                className={css({
                    fontSize: { base: '6xl', md: '8xl' },
                    fontWeight: 'bold',
                    color: 'gray.200',
                    lineHeight: 1,
                })}
            >
                404
            </p>
            <h1
                className={css({
                    fontSize: { base: 'xl', md: '2xl' },
                    fontWeight: 'bold',
                    color: 'gray.900',
                    mt: '4',
                })}
            >
                페이지를 찾을 수 없습니다
            </h1>
            <p
                className={css({
                    fontSize: 'sm',
                    color: 'gray.500',
                    mt: '3',
                    maxW: '400px',
                })}
            >
                요청하신 페이지가 존재하지 않거나, 이동되었거나, 일시적으로 사용할 수 없습니다.
            </p>
            <div
                className={css({
                    display: 'flex',
                    gap: '3',
                    mt: '8',
                    flexDirection: { base: 'column', sm: 'row' },
                    w: { base: 'full', sm: 'auto' },
                })}
            >
                <Link
                    href="/"
                    className={css({
                        px: '6',
                        py: '3',
                        bg: 'gray.900',
                        color: 'white',
                        borderRadius: 'lg',
                        fontSize: 'sm',
                        fontWeight: 'medium',
                        textAlign: 'center',
                        _hover: { bg: 'gray.700' },
                        _active: { bg: 'gray.800' },
                        transition: 'background 0.2s',
                        textDecoration: 'none',
                    })}
                >
                    홈으로 돌아가기
                </Link>
                <Link
                    href="/posts"
                    className={css({
                        px: '6',
                        py: '3',
                        borderWidth: '1px',
                        borderColor: 'gray.300',
                        color: 'gray.700',
                        borderRadius: 'lg',
                        fontSize: 'sm',
                        fontWeight: 'medium',
                        textAlign: 'center',
                        _hover: { bg: 'gray.50', borderColor: 'gray.400' },
                        _active: { bg: 'gray.100' },
                        transition: 'all 0.2s',
                        textDecoration: 'none',
                    })}
                >
                    글 목록 보기
                </Link>
            </div>
        </div>
    );
}
