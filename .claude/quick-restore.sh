#!/bin/bash
# Phase 3 Crypto Intelligence — Quick Session Restore
# Yarın sabah bunu çalıştır: bash .claude/quick-restore.sh

echo "🔄 AXIOM Phase 3 Session Restore..."
echo ""

# 1. Proje dizinine git
cd /Users/mehmetgulec/Documents/AXIOM/axiom-dashboard
echo "✅ Proje dizini: $(pwd)"
echo ""

# 2. Git status
echo "📊 Git Status:"
git log --oneline -3
echo ""

# 3. Memory dosyalarını oku (kontrol için)
echo "📝 Aktif Session:"
head -3 ~/.claude/projects/-Users-mehmetgulec-Documents-AXIOM/memory/session_2026-04-30_phase3_week1_day2.md
echo ""

# 4. Environment check
echo "⚙️  Environment Variables:"
if grep -q "GITHUB_API_TOKEN" .env.local; then
    echo "✅ GITHUB_API_TOKEN: $(grep GITHUB_API_TOKEN .env.local | cut -d= -f2 | head -c 20)..."
else
    echo "❌ GITHUB_API_TOKEN: NOT FOUND"
fi
echo ""

# 5. Dev server status
echo "🚀 Dev Server:"
if lsof -i :3000 > /dev/null 2>&1; then
    echo "✅ Server çalışıyor (port 3000)"
else
    echo "⏳ Server çalışmıyor. Başlatmak için: npm run dev"
fi
echo ""

# 6. Quick reference
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 QUICK REFERENCE:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔴 EĞER SERVER ÇALIŞMIYORSA:"
echo "   npm run dev"
echo ""
echo "🟢 TEST ENDPOINTS:"
echo "   Dev-Health:   http://localhost:3000/api/crypto/dev-health?symbol=SOL"
echo "   Tokenomics:   http://localhost:3000/api/crypto/tokenomics?symbol=SOL"
echo ""
echo "📚 MEMORY FILES:"
echo "   Bugün:   session_2026-04-30_phase3_week1_day2.md"
echo "   Index:   MEMORY.md"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✨ Hazırsın! Server başlat ve test et."
