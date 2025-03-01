import { use } from "react";

const asyncError = () => {
  if (Math.random() < 0.5) {
    return Promise.reject(new Error("asyncError"));
  }
  return Promise.resolve({ message: "Success!" });
};

type AsyncErrorProps = {
  promise?: Promise<{ message: string }>;
};

const AsyncErrorPage = ({ promise }: AsyncErrorProps) => {
  const e = use(promise || asyncError());
  return <div>{e.message}</div>;
};

export default AsyncErrorPage;
