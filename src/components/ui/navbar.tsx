"use client";
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border shadow-sm">
      <nav className="container mx-auto flex items-center justify-between py-3 px-2">
        <Link href="/" className="text-2xl font-bold text-primary">
          Stix N Vibes
        </Link>
        <div className="flex items-center space-x-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Menu</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {/* Placeholder for future cart icon */}
        </div>
      </nav>
      {/* Mobile dropdown (simple for now) */}
      {open && (
        <div className="absolute left-0 right-0 bg-background border-t border-border p-4">
          <ul className="flex flex-col space-y-2">
            <li>
              <Link href="/shop" className="block py-1 hover:text-primary">
                Shop
              </Link>
            </li>
            <li>
              <Link href="/about" className="block py-1 hover:text-primary">
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className="block py-1 hover:text-primary">
                Contact
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
