'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface FooterProps {
  locale: 'en' | 'tr';
}

export default function Footer({ locale }: FooterProps) {
  const t = useTranslations('footer');

  return (
    <footer className="border-t border-slate-700/50 bg-slate-900/80 py-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="font-bold text-white">AXIOM</span>
            </div>
            <p className="text-sm text-slate-400">{t('aboutText')}</p>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">{t('about')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="#features" className="text-slate-400 hover:text-white transition-colors">{t('features')}</Link></li>
              <li><Link href="#pricing" className="text-slate-400 hover:text-white transition-colors">{t('pricing')}</Link></li>
              <li><Link href="#" className="text-slate-400 hover:text-white transition-colors">{t('api')}</Link></li>
              <li><Link href="#" className="text-slate-400 hover:text-white transition-colors">{t('blog')}</Link></li>
            </ul>
          </div>

          {/* Learn */}
          <div>
            <h3 className="font-semibold text-white mb-4">{t('learn')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="text-slate-400 hover:text-white transition-colors">{t('guides')}</Link></li>
              <li><Link href="#" className="text-slate-400 hover:text-white transition-colors">{t('community')}</Link></li>
              <li><Link href="#" className="text-slate-400 hover:text-white transition-colors">{t('contact')}</Link></li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="font-semibold text-white mb-4">{t('connect')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://instagram.com/axiom" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                  📱 {t('instagram')}
                </a>
              </li>
              <li>
                <a href="https://t.me/axiom_bot" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                  💬 {t('telegram')}
                </a>
              </li>
              <li>
                <a href="https://twitter.com/axiom" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                  🐦 {t('twitter')}
                </a>
              </li>
              <li>
                <a href="mailto:hello@axiom.io" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                  ✉️ {t('email')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent my-8"></div>

        {/* Bottom Section */}
        <div className="space-y-4">
          {/* Disclaimer */}
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-xs text-red-300">{t('disclaimer')}</p>
          </div>

          {/* Links & Copyright */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">{t('copyright')}</p>
            <div className="flex gap-6 text-sm">
              <Link href="#" className="text-slate-400 hover:text-white transition-colors">{t('privacy')}</Link>
              <Link href="#" className="text-slate-400 hover:text-white transition-colors">{t('terms')}</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
