import { Link } from 'react-router';
import { Button } from '@design-system/ui';
import { Center } from '@design-system/ui-lib/jsx';

export function HomePage() {
  return (
    <Center h="100vh" flexDir="column" gap={8}>
      <Link to="/toast">
        <Button>Toast 예제 보기</Button>
      </Link>
      <Link to="/error-design">
        <Button>에러 디자인 예시 보러가기</Button>
      </Link>
    </Center>
  );
}
