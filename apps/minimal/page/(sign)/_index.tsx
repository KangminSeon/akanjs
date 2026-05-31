import { Link } from "akanjs/ui";

export default function Page() {
  return (
    <>
      <div className="absolute inset-x-0 top-12 m-auto grid place-items-center">
        <div className="font-lemonmilk text-4xl text-white">Akan</div>
        <div className="mt-4 text-center text-2xl text-white">Minimal System for Akan.js</div>
      </div>
      <Link className="absolute inset-x-0 bottom-16 m-auto grid place-items-center">
        <button className="btn btn-primary text-xl">Go to Dashboard</button>
      </Link>
    </>
  );
}
