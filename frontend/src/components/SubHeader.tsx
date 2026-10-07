'use client';
import { useRouter } from 'next/navigation';
import { HiChevronLeft } from 'react-icons/hi2';

interface SubHeaderProps {
  title: string;
}

export default function SubHeader({ title }: SubHeaderProps) {
  const router = useRouter();

  return (
    <header className="w-full bg-primary-dark text-white shadow-md relative z-10">
      <div className="relative max-w-lg mx-auto px-4 py-4 flex items-center justify-center min-h-[60px]">
        <button 
          onClick={() => router.back()}
          className="absolute left-4 p-1.5 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Kembali"
        >
          <HiChevronLeft size={24} />
        </button>
        <h1 className="text-lg text-white font-bold tracking-wide">
          {title}
        </h1>
      </div>
    </header>
  );
}
