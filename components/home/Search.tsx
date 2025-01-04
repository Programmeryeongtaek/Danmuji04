import { SearchIcon } from 'lucide-react';

const Search = () => {
  return (
    <section className="flex h-40 w-full items-center justify-center border border-black">
      <div className="flex-col pt-10">
        <span className="flex justify-center pb-3">무지를 끊다.</span>
        <div className="relative h-[50px] w-full">
          <input
            type="text"
            placeholder="공부하고 싶은 키워드를 입력해보세요."
            className="flex h-[50px] min-w-[350px] rounded-3xl border pl-4"
          />
          <SearchIcon className="absolute right-5 top-3" />
        </div>
      </div>
    </section>
  );
};

export default Search;
