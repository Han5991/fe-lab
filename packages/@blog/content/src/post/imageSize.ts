// 이미지 파일 머리말에서 폭·높이만 읽는다 — 디코딩도 sharp(비동기)도 쓰지 않아, 글을 읽어 들이는 동기
// 경로(`collectPosts`)에서 부를 수 있다. 빌드가 최적화하는 형식(`isOptimizableThumbnail` — png·jpg)만 안다.

export interface ImageSize {
  width: number;
  height: number;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** IHDR 청크의 폭(16)·높이(20) 오프셋 — 시그니처 8 + 청크 길이 4 + 이름 4. */
const PNG_WIDTH_OFFSET = 16;

/** SOF 마커(프레임 헤더) — 0xC4(허프만 표)·0xC8(예약)·0xCC(산술 부호 조건)는 SOF가 아니다. */
function isSofMarker(marker: number): boolean {
  return (
    marker >= 0xc0 &&
    marker <= 0xcf &&
    marker !== 0xc4 &&
    marker !== 0xc8 &&
    marker !== 0xcc
  );
}

function readPng(bytes: Uint8Array): ImageSize | null {
  if (bytes.length < PNG_WIDTH_OFFSET + 8) return null;
  if (!PNG_SIGNATURE.every((byte, i) => bytes[i] === byte)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    width: view.getUint32(PNG_WIDTH_OFFSET),
    height: view.getUint32(PNG_WIDTH_OFFSET + 4),
  };
}

function readJpeg(bytes: Uint8Array): ImageSize | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;
  // 마커 하나 = 0xFF, 종류 1바이트, (SOI·EOI·RSTn 말고는) 길이 2바이트가 붙은 세그먼트.
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    if (marker === undefined) return null;
    // 채움 바이트(0xFF 연속)는 한 칸씩 넘긴다.
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (isSofMarker(marker)) {
      // 세그먼트: 길이 2 · 정밀도 1 · 높이 2 · 폭 2.
      if (offset + 9 > bytes.length) return null;
      return {
        width: view.getUint16(offset + 7),
        height: view.getUint16(offset + 5),
      };
    }
    offset += 2 + view.getUint16(offset + 2);
  }
  return null;
}

/**
 * 파일 앞부분(머리말)의 바이트에서 이미지의 폭·높이를 읽는다. 모르는 형식이거나 머리말이 잘렸거나 0이면 null.
 * EXIF 회전은 보지 않는다 — 썸네일은 화면에 그려지는 방향 그대로 저장돼 있다는 전제다.
 */
export function readImageSize(bytes: Uint8Array): ImageSize | null {
  const size = readPng(bytes) ?? readJpeg(bytes);
  if (!size || size.width === 0 || size.height === 0) return null;
  return size;
}
