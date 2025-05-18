import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import { Button } from '@design-system/ui';

const Page = () => (
  <div className={css({ color: 'blue' })}>
    <h1>Home</h1>
    <Link href="/about">link</Link>
    <Button>count</Button>
  </div>
);

export default Page;
