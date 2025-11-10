import { Music } from 'lucide-react';
import { motion } from 'framer-motion';

export function Navbar() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/70 border-b border-gray-200/80 shadow-sm"
    >
      <div className="container flex h-16 items-center px-6 mx-auto">
        <div className="mr-4 flex">
          <a href="/" className="flex items-center space-x-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-3"
            >
              <div className="p-2 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-lg">
                <Music className="w-5 h-5 text-blue-600" />
              </div>
              <span className="font-semibold text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                lyricai
              </span>
            </motion.div>
          </a>
        </div>
        <nav className="flex items-center ml-auto space-x-6 text-sm font-medium">
          <a href="/" className="transition-colors hover:text-blue-600">
            Home
          </a>
          <a href="/examples" className="transition-colors hover:text-blue-600">
            Examples
          </a>
          <a href="/about" className="transition-colors hover:text-blue-600">
            About
          </a>
          <a href="/get-started" className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors">
            Get Started
          </a>
        </nav>
      </div>
    </motion.header>
  );
}
