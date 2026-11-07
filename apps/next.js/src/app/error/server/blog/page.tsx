import Link from 'next/link';
import { parsePosts } from './post';

const Page = async () => {
  const data = await fetch('https://api.vercel.app/blog');
  const posts = parsePosts(await data.json());
  return (
    <ul className="list-disc pl-5 space-y-2 flex flex-col items-center">
      {posts.map(post => (
        <li key={post.id} className="text-lg text-gray-700 hover:text-blue-500">
          <Link href={`/error/server/blog/${post.id}`}>{post.title}</Link>
        </li>
      ))}
    </ul>
  );
};

export default Page;
