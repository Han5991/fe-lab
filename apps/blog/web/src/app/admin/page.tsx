'use client';

import { client } from '@/lib/client';
import { useRouter } from 'next/navigation';
import { LogOut, BarChart3, Users, FileText } from 'lucide-react';
import { css } from '@design-system/ui-lib/css';

export default function AdminDashboardPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await client.auth.signOut({ scope: 'local' });
    router.push('/admin/login');
  };

  return (
    <div
      className={css({
        minH: 'calc(100dvh-128px)',
        bg: '#f9fafb',
        p: '2rem',
      })}
    >
      <header
        className={css({
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: '2rem',
          bg: 'white',
          p: '1rem 2rem',
          rounded: '8px',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        })}
      >
        <h1
          className={css({
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#111827',
          })}
        >
          관리자 대시보드
        </h1>
        <button
          onClick={handleLogout}
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            p: '0.5rem 1rem',
            color: '#4b5563',
            cursor: 'pointer',
            rounded: '4px',
            transition: 'background-color 0.2s',
            _hover: { bg: '#f3f4f6', color: '#ef4444' },
          })}
        >
          <LogOut size={18} />
          로그아웃
        </button>
      </header>

      <div
        className={css({
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
        })}
      >
        {/* Placeholder Stat Cards */}
        {[
          { title: '총 조회수', value: '0', icon: BarChart3, color: '#3b82f6' },
          {
            title: '잔여 게시글',
            value: '0',
            icon: FileText,
            color: '#10b981',
          },
          { title: '활성 사용자', value: '1', icon: Users, color: '#8b5cf6' },
        ].map(stat => (
          <div
            key={stat.title}
            className={css({
              bg: 'white',
              p: '1.5rem',
              rounded: '8px',
              boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            })}
          >
            <div
              className={css({
                p: '1rem',
                rounded: '9999px',
                bg: `${stat.color}15`,
                color: stat.color,
              })}
            >
              <stat.icon size={24} />
            </div>
            <div>
              <p
                className={css({
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  fontWeight: '500',
                })}
              >
                {stat.title}
              </p>
              <p
                className={css({
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#111827',
                  mt: '0.25rem',
                })}
              >
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div
        className={css({
          mt: '2rem',
          bg: 'white',
          p: '2rem',
          rounded: '8px',
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        })}
      >
        <h2
          className={css({
            fontSize: '1.25rem',
            fontWeight: '600',
            mb: '1rem',
            color: '#111827',
          })}
        >
          최근 통계 (준비 중)
        </h2>
        <div
          className={css({
            h: '300px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px dashed #e5e7eb',
            rounded: '8px',
          })}
        >
          <p className={css({ color: '#9ca3af' })}>
            향후 차트가 여기에 표시됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
