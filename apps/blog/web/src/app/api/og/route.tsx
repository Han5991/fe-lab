import { ImageResponse } from 'next/og';
import { type NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || 'Frontend Lab';
    const date = searchParams.get('date') || '';

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#ffffff',
                    color: '#111827',
                    padding: '80px',
                    position: 'relative',
                }}
            >
                {/* Background Pattern */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: 'radial-gradient(circle at 25px 25px, #e5e7eb 2%, transparent 0%), radial-gradient(circle at 75px 75px, #e5e7eb 2%, transparent 0%)',
                        backgroundSize: '100px 100px',
                        opacity: 0.5,
                    }}
                />

                {/* Logo/Badge */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        padding: '12px 32px',
                        borderRadius: '999px',
                        fontSize: 24,
                        marginBottom: 48,
                        fontWeight: 700,
                        border: '1px solid #dbeafe',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                >
                    FE Lab
                </div>

                {/* Title */}
                <div
                    style={{
                        fontSize: 78,
                        fontWeight: 900,
                        textAlign: 'center',
                        lineHeight: 1.1,
                        color: '#111827',
                        marginBottom: 24,
                        textShadow: '0 2px 10px rgba(0,0,0,0.1)',
                        overflow: 'hidden',
                        maxHeight: '350px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}
                >
                    {title}
                </div>

                {/* Date */}
                {date && (
                    <div
                        style={{
                            fontSize: 28,
                            color: '#6b7280',
                            marginTop: 24,
                        }}
                    >
                        {date}
                    </div>
                )}

                {/* Footer URL */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: 60,
                        fontSize: 24,
                        color: '#9ca3af',
                        fontWeight: 500,
                    }}
                >
                    blog.sangwook.dev
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
        }
    );
}
