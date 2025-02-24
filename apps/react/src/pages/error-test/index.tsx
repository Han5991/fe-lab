import { useSimpleQuery } from "@/hooks";

const ErrorTest = () => {
  const { data } = useSimpleQuery({
    queryFn: async () => {
      if (Math.random() < 0.5) {
        throw new Error("An intentional error occurred");
      }
      return { message: "Success!" };
    },
    throwOnError: true,
  });
  return <div>{data?.message}</div>;
};

export default ErrorTest;
