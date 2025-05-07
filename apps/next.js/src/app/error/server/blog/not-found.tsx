import Link from 'next/link';

const NotFound = async () => (
  <div>
    <h2>blog Not Found</h2>
    <p>Could not find requested resource</p>
    <p>
      View <Link href="/">home</Link>
    </p>
  </div>
);

export default NotFound;
